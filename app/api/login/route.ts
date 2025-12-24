import { NextResponse } from "next/server";
import { Client } from "ldapts";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, sanitizeUser, sessionCookieOptions } from "@/lib/session";
import { createActivityLog } from "@/actions/admin/logs";

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
  const existingByUsername = await prisma.user.findUnique({
    where: { username },
  });

  let safeEmail: string | null = null;
  let emailOwner: { id: string; username: string } | null = null;

  if (email) {
    const found = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true },
    });

    if (!found || found.username === username) {
      safeEmail = email;
      emailOwner = found;
    } else {
      emailOwner = found;
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

  return prisma.user.create({
    data: {
      email: safeEmail,
      username,
      firstname,
      lastname,
      role: 'employee',
      department,
      position,
      avatar: null,
      status: 'active',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username: rawUsername, password } = body;

    const username = rawUsername;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing username or password" },
        { status: 400 }
      );
    }

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

    const LDAP_URL = process.env.LDAP_URL as string;
    const LDAP_BIND_DN = process.env.LDAP_BIND_DN as string;
    const LDAP_BIND_PWD = process.env.LDAP_PWD as string;
    const LDAP_BASE_DN = process.env.LDAP_BASE_DN as string;

    if (!LDAP_URL || !LDAP_BIND_DN || !LDAP_BIND_PWD || !LDAP_BASE_DN) {
      return NextResponse.json(
        { error: "LDAP configuration is missing" },
        { status: 500 }
      );
    }

    const client = new Client({
      url: LDAP_URL,
      tlsOptions: { rejectUnauthorized: false },
    });

    await client.bind(LDAP_BIND_DN, LDAP_BIND_PWD);

    const { searchEntries } = await client.search(LDAP_BASE_DN, {
      scope: "sub",
      filter: `(sAMAccountName=${escapedUsername})`,
      attributes: ["dn", "cn", "mail", "givenName", "sn", "department", "title"],
    });

    if (searchEntries.length === 0) {
      await client.unbind();
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = searchEntries[0];
    const userDN = user.dn;

    // Vérification du mot de passe
    const userClient = new Client({
      url: LDAP_URL,
      tlsOptions: { rejectUnauthorized: false },
    });

    try {
      await userClient.bind(userDN, password);
    } catch {
      await userClient.unbind();
      await client.unbind();
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await userClient.unbind();
    await client.unbind();

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
    console.error("[Login API] Erreur:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Authentication failed", details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}