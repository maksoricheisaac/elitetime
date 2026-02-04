import { Client } from "ldapts";
import prisma from "@/lib/prisma";

interface LdapSyncResult {
  syncedCount: number;
}

function getLdapValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    const firstValue = value[0] as unknown;
    if (typeof firstValue === "string") return firstValue;
    if (Buffer.isBuffer(firstValue)) return firstValue.toString("utf8");
    return String(firstValue);
  }
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value);
}

async function upsertFromLdap(
  username: string,
  {
    email,
    firstname,
    lastname,
    department,
    position,
    status,
  }: {
    email: string | null;
    firstname: string | null;
    lastname: string | null;
    department: string | null;
    position: string | null;
    status: "active" | "inactive";
  },
) {
  const existingByUsername = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
      status: { not: "deleted" },
    },
  });

  let safeEmail: string | null = null;
  let emailOwner: { id: string; username: string } | null = null;

  if (email) {
    const found = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
        status: { not: "deleted" },
      },
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
        email: safeEmail ?? existingByUsername.email,
        firstname: firstname ?? existingByUsername.firstname,
        lastname: lastname ?? existingByUsername.lastname,
        department: department ?? existingByUsername.department,
        position: position ?? existingByUsername.position,
        status,
      },
    });
  }

  if (emailOwner) {
    const existingByEmail = await prisma.user.findUnique({
      where: { id: emailOwner.id },
    });

    return prisma.user.update({
      where: { id: emailOwner.id },
      data: {
        username,
        firstname: firstname ?? existingByEmail?.firstname,
        lastname: lastname ?? existingByEmail?.lastname,
        department: department ?? existingByEmail?.department,
        position: position ?? existingByEmail?.position,
        status,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: safeEmail,
      username,
      firstname,
      lastname,
      role: "employee",
      department,
      position,
      avatar: null,
      status,
    },
  });
}

export async function syncEmployeesFromLdapCore(): Promise<LdapSyncResult> {
  const LDAP_URL = process.env.LDAP_URL as string | undefined;
  const LDAP_BIND_DN = process.env.LDAP_BIND_DN as string | undefined;
  const LDAP_BIND_PWD = process.env.LDAP_PWD as string | undefined;
  const LDAP_BASE_DN = process.env.LDAP_BASE_DN as string | undefined;

  if (!LDAP_URL || !LDAP_BIND_DN || !LDAP_BIND_PWD || !LDAP_BASE_DN) {
    throw new Error("Configuration LDAP manquante pour la synchronisation des employés.");
  }

  const client = new Client({
    url: LDAP_URL,
    timeout: 10000,
    connectTimeout: 5000,
  });

  try {
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

      const ldapEmail = getLdapValue((entry as Record<string, unknown>)["mail"]);
      const rawLdapFirstname = getLdapValue((entry as Record<string, unknown>)["givenName"]);
      const rawLdapLastname = getLdapValue((entry as Record<string, unknown>)["sn"]);
      const ldapCn = getLdapValue((entry as Record<string, unknown>)["cn"]);

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

      const ldapDepartment = getLdapValue((entry as Record<string, unknown>)["department"]);
      const ldapPosition = getLdapValue((entry as Record<string, unknown>)["title"]);

      const rawUac = (entry as Record<string, unknown>)["userAccountControl"];
      const uacNumber = rawUac != null ? Number(Array.isArray(rawUac) ? rawUac[0] : rawUac) : NaN;
      const isDisabled = !Number.isNaN(uacNumber) && (uacNumber & 2) === 2;
      const userStatus: "active" | "inactive" = isDisabled ? "inactive" : "active";

      await upsertFromLdap(username, {
        email: ldapEmail,
        firstname: ldapFirstname,
        lastname: ldapLastname,
        department: ldapDepartment,
        position: ldapPosition,
        status: userStatus,
      });

      syncedCount += 1;
    }

    if (ldapUsernames.length > 0) {
      await prisma.user.updateMany({
        where: {
          role: "employee",
          status: "active",
          username: {
            notIn: ldapUsernames,
          },
        },
        data: {
          status: "deleted",
        },
      });
    }

    return { syncedCount };
  } finally {
    try {
      await client.unbind();
    } catch {
      // ignore
    }
  }
}
