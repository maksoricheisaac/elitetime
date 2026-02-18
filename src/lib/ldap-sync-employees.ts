import { Client } from "ldapts";
import prisma from "@/lib/prisma";

interface LdapSyncResult {
  syncedCount: number;
}

function getLdapValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    const firstValue = value[0];
    if (typeof firstValue === "string") return firstValue;
    if (Buffer.isBuffer(firstValue)) return firstValue.toString("utf8");
    return String(firstValue);
  }
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value);
}

async function safeUpsertUser(
  username: string,
  {
    email,
    firstname,
    lastname,
    status,
    hiddenFromLists,
  }: {
    email: string | null;
    firstname: string | null;
    lastname: string | null;
    department: string | null;
    position: string | null;
    status: "active" | "inactive";
    hiddenFromLists: boolean;
  }
) {
  // 1) On cherche l'utilisateur uniquement par username (clé métier)
  const existingUser = await prisma.user.findUnique({ where: { username } });

  // 2) Si l'utilisateur existe déjà :
  //    - on NE TOUCHE PAS à role / department / position / email
  //    - on peut éventuellement mettre à jour le prénom/nom et le status
  if (existingUser) {
    return prisma.user.update({
      where: { username },
      data: {
        firstname: firstname ?? existingUser.firstname,
        lastname: lastname ?? existingUser.lastname,
        status,
        hiddenFromLists: existingUser.hiddenFromLists || hiddenFromLists,
      },
    });
  }

  // 3) L'utilisateur n'existe pas encore : on prépare l'email en évitant les conflits
  let safeEmail: string | null = null;
  if (email) {
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    // Si quelqu'un a déjà cet email, on la laisse à null pour éviter P2002
    if (!emailOwner) {
      safeEmail = email;
    }
  }

  // 4) Création d'un nouvel employé
  return prisma.user.create({
    data: {
      username,
      email: safeEmail,
      firstname,
      lastname,
      // On laisse department / position / role à leurs valeurs par défaut ou null
      status,
      hiddenFromLists,
      avatar: null,
    },
  });
}


export async function syncEmployeesFromLdapCore(): Promise<LdapSyncResult> {
  const LDAP_URL = process.env.LDAP_URL as string | undefined;
  const LDAP_BIND_DN = process.env.LDAP_BIND_DN as string | undefined;
  const LDAP_BIND_PWD = process.env.LDAP_PWD as string | undefined;
  const LDAP_BASE_DN = process.env.LDAP_BASE_DN as string | undefined;

  if (!LDAP_URL || !LDAP_BIND_DN || !LDAP_BIND_PWD || !LDAP_BASE_DN) {
    console.error(
      "[ldap-sync] Configuration LDAP manquante pour la synchronisation des employés.",
      { hasUrl: !!LDAP_URL, hasBindDn: !!LDAP_BIND_DN, hasBindPwd: !!LDAP_BIND_PWD, hasBaseDn: !!LDAP_BASE_DN }
    );
    throw new Error("Configuration LDAP manquante pour la synchronisation des employés.");
  }

  const client = new Client({ url: LDAP_URL, timeout: 10000, connectTimeout: 5000 });

  try {
    const hiddenRules = await prisma.hiddenUsername.findMany({
      where: { hidden: true },
      select: { username: true },
    });
    const hiddenUsernames = new Set(hiddenRules.map((r) => r.username.trim().toLowerCase()).filter(Boolean));

    console.log("[ldap-sync] Démarrage de la synchronisation des employés depuis l'AD...");
    await client.bind(LDAP_BIND_DN, LDAP_BIND_PWD);

    const { searchEntries } = await client.search(LDAP_BASE_DN, {
      scope: "sub",
      filter: "(&(objectClass=user)(!(sAMAccountName=*$)))",
      attributes: [
        "cn",
        "sAMAccountName",
        "mail",
        "givenName",
        "sn",
        "department",
        "title",
        "userAccountControl",
      ],
    });

    const users = searchEntries.filter((entry) => {
      const accountValue = (entry as Record<string, unknown>)["sAMAccountName"];
      const rawName = Array.isArray(accountValue) ? accountValue[0] : accountValue;
      const name = typeof rawName === "string" ? rawName : rawName?.toString();
      return !!name && !["krbtgt", "Administrateur", "Invité"].includes(name as string);
    });

    let syncedCount = 0;
    const ldapUsernames: string[] = [];

    for (const entry of users) {
      const accountValue = (entry as Record<string, unknown>)["sAMAccountName"];
      const rawName = Array.isArray(accountValue) ? accountValue[0] : accountValue;
      const username = typeof rawName === "string" ? rawName : rawName?.toString();
      if (!username) continue;

      ldapUsernames.push(username);

      const shouldBeHidden = hiddenUsernames.has(username.trim().toLowerCase());

      const ldapEmail = getLdapValue((entry as Record<string, unknown>)["mail"]);
      const rawFirstname = getLdapValue((entry as Record<string, unknown>)["givenName"]);
      const rawLastname = getLdapValue((entry as Record<string, unknown>)["sn"]);
      const ldapCn = getLdapValue((entry as Record<string, unknown>)["cn"]);

      let firstname = rawFirstname;
      let lastname = rawLastname;
      if ((!firstname || !lastname) && ldapCn) {
        const parts = ldapCn.split(/\s+/).filter(Boolean);
        if (!firstname && parts.length > 0) firstname = parts[0];
        if (!lastname && parts.length > 1) lastname = parts.slice(1).join(" ");
      }

      const department = getLdapValue((entry as Record<string, unknown>)["department"]);
      const position = getLdapValue((entry as Record<string, unknown>)["title"]);

      const rawUac = (entry as Record<string, unknown>)["userAccountControl"];
      const uacNumber = rawUac != null ? Number(Array.isArray(rawUac) ? rawUac[0] : rawUac) : NaN;
      const status: "active" | "inactive" = !Number.isNaN(uacNumber) && (uacNumber & 2) === 2 ? "inactive" : "active";

      await safeUpsertUser(username, {
        email: ldapEmail,
        firstname,
        lastname,
        department,
        position,
        status,
        hiddenFromLists: shouldBeHidden,
      });
      syncedCount += 1;
    }

    if (hiddenUsernames.size > 0) {
      await prisma.user.updateMany({
        where: { username: { in: Array.from(hiddenUsernames) } },
        data: { hiddenFromLists: true },
      });
    }

    // Marquer les utilisateurs absents de LDAP comme deleted
    if (ldapUsernames.length > 0) {
      await prisma.user.updateMany({
        where: { role: "employee", status: "active", username: { notIn: ldapUsernames } },
        data: { status: "deleted" },
      });
    }

    console.log(`[ldap-sync] Synchronisation terminée, ${syncedCount} employé(s) traités.`);
    return { syncedCount };
  } catch (error) {
    console.error("[ldap-sync] Erreur lors de la synchronisation des employés:", error);
    if (error instanceof Error) throw new Error(`Échec de la synchronisation LDAP des employés : ${error.message}`);
    throw new Error("Échec de la synchronisation LDAP des employés : erreur inconnue.");
  } finally {
    try {
      await client.unbind();
    } catch (unbindError) {
      console.error("[ldap-sync] Erreur lors de la fermeture de la connexion LDAP:", unbindError);
    }
  }
}
