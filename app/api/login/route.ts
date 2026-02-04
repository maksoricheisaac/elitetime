import { NextResponse } from "next/server";
import { Client } from "ldapts";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, sanitizeUser, sessionCookieOptions } from "@/lib/session";
import { createActivityLog } from "@/actions/admin/logs";
import { validateAndSanitize, LoginSchema } from "@/lib/validation/schemas";
import { checkRateLimit, markLoginAttempt, logSecurityEvent } from "@/lib/security/rbac";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function upsertUser(
  username: string,
  {
    email,
    firstname,
    lastname,
    department,
    position,
  }: {
    email: string | null;
    firstname: string | null;
    lastname: string | null;
    department: string | null;
    position: string | null;
  }
) {
  // 1) Rechercher tous les comptes avec ce username (insensible à la casse)
  const usersWithSameUsername = await prisma.user.findMany({
    where: {
      username: {
        equals: username,
        mode: 'insensitive',
      },
      status: { not: 'deleted' },
    },
  });

  // Si plusieurs comptes existent avec ce username (ex: un admin et un employé),
  // on privilégie toujours un compte non "employee" pour éviter de se connecter
  // sur un doublon employé.
  const existingByUsername =
    usersWithSameUsername.find((u) => u.role !== 'employee') ?? usersWithSameUsername[0] ?? null;

  let safeEmail: string | null = null;
  let emailOwner: { id: string; username: string; role: string } | null = null;

  if (email) {
    const foundCandidates = await prisma.user.findMany({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        status: { not: 'deleted' },
      },
      select: { id: true, username: true, role: true },
    });

    const preferredByEmail =
      foundCandidates.find((u) => u.username.toLowerCase() === username.toLowerCase()) ??
      foundCandidates.find((u) => u.role !== 'employee') ??
      foundCandidates[0];

    if (!preferredByEmail || preferredByEmail.username.toLowerCase() === username.toLowerCase()) {
      safeEmail = email;
      emailOwner = preferredByEmail ?? null;
    } else {
      emailOwner = preferredByEmail;
    }
  }

  if (existingByUsername) {
    return prisma.user.update({
      where: { id: existingByUsername.id },
      data: {
        email: safeEmail,
        firstname,
        lastname,
        department,
        position,
        status: 'active',
      },
    });
  }

  if (emailOwner) {
    return prisma.user.update({
      where: { id: emailOwner.id },
      data: {
        username,
        firstname,
        lastname,
        department,
        position,
        status: 'active',
      },
    });
  }

  // Aucun compte existant : créer automatiquement un nouvel employé.
  return prisma.user.create({
    data: {
      username,
      email: safeEmail ?? email,
      firstname,
      lastname,
      department,
      position,
      role: 'employee',
      status: 'active',
    },
  });
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const body = await req.json();

    // Valider et nettoyer les données d'entrée
    const { username, password } = validateAndSanitize(LoginSchema, body);

    // Rate limiting par IP et username
    const canAttempt = await checkRateLimit(`${clientIp}:${username}`);
    if (!canAttempt) {
      await markLoginAttempt(username, false);
      await logSecurityEvent(
        'system',
        'LOGIN_RATE_LIMITED',
        `Trop de tentatives pour ${username} depuis ${clientIp}`,
        clientIp,
        userAgent
      );
      return NextResponse.json(
        { error: "Trop de tentatives de connexion. Réessayez plus tard." },
        { status: 429 }
      );
    }

    // Configuration LDAP avec validation
    const LDAP_URL = process.env.LDAP_URL as string;
    const LDAP_BIND_DN = process.env.LDAP_BIND_DN as string;
    const LDAP_BIND_PWD = process.env.LDAP_PWD as string;
    const LDAP_BASE_DN = process.env.LDAP_BASE_DN as string;

    if (!LDAP_URL || !LDAP_BIND_DN || !LDAP_BIND_PWD || !LDAP_BASE_DN) {
      await markLoginAttempt(username, false);
      await logSecurityEvent(
        'system',
        'LDAP_CONFIG_MISSING',
        'Configuration LDAP manquante',
        clientIp,
        userAgent
      );
      return NextResponse.json(
        { error: "Service temporairement indisponible" },
        { status: 503 }
      );
    }

    // Connexion LDAP sécurisée avec timeout
    const client = new Client({
      url: LDAP_URL,
      timeout: 10000,
      connectTimeout: 5000,
    });

    await client.bind(LDAP_BIND_DN, LDAP_BIND_PWD);

    // Échapper les caractères spéciaux LDAP pour éviter les injections
    const escapeLdapFilter = (value: string): string => {
      return value
        .replace(/\\/g, '\\5c')
        .replace(/\*/g, '\\2a')
        .replace(/\(/g, '\\28')
        .replace(/\)/g, '\\29')
        .replace(/\0/g, '\\00')
        .replace(/\//g, '\\2f');
    };

    const escapedUsername = escapeLdapFilter(username);

    const { searchEntries } = await client.search(LDAP_BASE_DN, {
      scope: "sub",
      filter: `(sAMAccountName=${escapedUsername})`,
      attributes: ["dn", "cn", "mail", "givenName", "sn", "department", "title"],
      sizeLimit: 1, // Limiter à 1 résultat pour éviter l'énumération
    });

    if (searchEntries.length === 0) {
      await client.unbind();
      await markLoginAttempt(username, false);
      // Ne pas révéler si l'utilisateur existe
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    const user = searchEntries[0];
    console.log('User : ', user)
    const userDN = user.dn;

    // Vérification du mot de passe avec client séparé
    const userClient = new Client({
      url: LDAP_URL,
      timeout: 10000,
      connectTimeout: 5000,
    });


    try {
      const verify = await userClient.bind(userDN, password);
      console.log('UserDN : ', userDN)
      console.log('Password : ', password)
      console.log('Verify : ', verify)
    } catch {
      await userClient.unbind();
      await client.unbind();
      await markLoginAttempt(username, false);
      // Message générique pour éviter l'énumération
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    await userClient.unbind();
    await client.unbind();

    // Marquer la tentative comme réussie
    await markLoginAttempt(username, true);

    // Fonction helper pour extraire et convertir les valeurs LDAP en string
    const getLdapValue = (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && value.length > 0) {
        const firstValue = value[0];
        if (typeof firstValue === 'string') return firstValue;
        if (Buffer.isBuffer(firstValue)) return firstValue.toString('utf8');
        return String(firstValue);
      }
      if (Buffer.isBuffer(value)) return value.toString('utf8');
      return String(value);
    };

    // Extraire les données de l'utilisateur LDAP
    const ldapUser = searchEntries[0];
    const ldapEmail = getLdapValue(ldapUser.mail);
    const rawLdapFirstname = getLdapValue(ldapUser.givenName);
    const rawLdapLastname = getLdapValue(ldapUser.sn);
    const ldapCn = getLdapValue(ldapUser.cn);

    // Déterminer prénom/nom avec fallback sur le CN si givenName/sn sont vides
    let ldapFirstname = rawLdapFirstname;
    let ldapLastname = rawLdapLastname;

    if ((!ldapFirstname || !ldapLastname) && ldapCn) {
      const cnParts = ldapCn.split(/\s+/).filter(Boolean);

      if (!ldapFirstname && cnParts.length > 0) {
        ldapFirstname = cnParts[0];
      }

      if (!ldapLastname && cnParts.length > 1) {
        ldapLastname = cnParts.slice(1).join(" ");
      }
    }

    const ldapDepartment = getLdapValue(ldapUser.department);
    const ldapPosition = getLdapValue(ldapUser.title);

    const appUser = await upsertUser(username, {
      email: ldapEmail,
      firstname: ldapFirstname,
      lastname: ldapLastname,
      department: ldapDepartment,
      position: ldapPosition,
    });

    // Si aucun utilisateur applicatif ne correspond, on considère les identifiants comme invalides
    // (on ne crée pas de nouvel employé automatiquement).
    if (!appUser) {
      await markLoginAttempt(username, false);
      await logSecurityEvent(
        'system',
        'LOGIN_USER_NOT_FOUND',
        `Aucun utilisateur applicatif correspondant pour ${username}`,
        clientIp,
        userAgent
      );
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // Créer la session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    await prisma.session.create({
      data: {
        userId: appUser.id,
        sessionToken,
        expiresAt,
      },
    });

    // Log the login activity
    await createActivityLog(
      appUser.id,
      "Connexion",
      `${appUser.firstname || ""} ${appUser.lastname || ""}`.trim() || appUser.username,
      "auth"
    );
    
    // Logger de sécurité supplémentaire
    await logSecurityEvent(
      appUser.id,
      'LOGIN_SUCCESS',
      `Connexion réussie pour ${username}`,
      clientIp,
      userAgent
    );

    const safeUser = sanitizeUser(appUser);

    const response = NextResponse.json(
      {
        success: true,
        message: "Authentication successful",
        user: safeUser,
      },
      { status: 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);

    return response;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    
    // Logger l'erreur sans révéler d'informations sensibles
    console.error(`[Login API] Erreur (${duration}ms):`, {
      error: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIp,
      userAgent: userAgent.substring(0, 100), // Limiter la taille
    });
    
    // Logger de sécurité
    await logSecurityEvent(
      'system',
      'LOGIN_ERROR',
      `Erreur lors de la connexion: ${error instanceof Error ? error.name : 'Unknown'}`,
      clientIp,
      userAgent
    );

    // Ne jamais révéler les détails de l'erreur au client
    return NextResponse.json(
      { error: "Service temporairement indisponible" },
      { status: 500 }
    );
  }
}