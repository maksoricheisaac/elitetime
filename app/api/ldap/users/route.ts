import { NextResponse } from "next/server";
import { Client } from "ldapts";

const isDisabled = (uac?: number | string) => {
  const value = Number(uac);
  return !isNaN(value) && (value & 2) === 2;
};

export async function GET() {
  const url = process.env.LDAP_URL as string;
  const bindDN = process.env.LDAP_BIND_DN as string;
  const password = process.env.LDAP_PWD as string;
  const baseDN = process.env.LDAP_BASE_DN as string;

  const client = new Client({
    url,
    tlsOptions: { rejectUnauthorized: false },
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    await client.bind(bindDN, password);

    const { searchEntries } = await client.search(baseDN, {
      scope: "sub",
      filter: "(&(objectClass=user)(!(sAMAccountName=*$)))",
      attributes: [
        "cn",
        "sAMAccountName",
        "mail",
        "givenName",
        "sn",
        "userAccountControl",
      ],
    });

    const users = searchEntries
      .filter((entry) => {
        const raw = entry.sAMAccountName;
        const name = Array.isArray(raw) ? raw[0] : raw;
        return (
          !!name &&
          !["krbtgt", "Administrateur", "Invité"].includes(name.toString())
        );
      })
      .map((entry) => {
        const uac = parseInt(entry.userAccountControl as string);

        return {
          cn: entry.cn,
          username: entry.sAMAccountName,
          mail: entry.mail,
          givenName: entry.givenName,
          sn: entry.sn,
          status: isDisabled(uac) ? "DISABLED" : "ACTIVE",
          disabled: isDisabled(uac),
        };
      });

    const activeUsers = users.filter((u) => !u.disabled);
    const disabledUsers = users.filter((u) => u.disabled);

    return NextResponse.json({
      total: users.length,
      active: activeUsers.length,
      disabled: disabledUsers.length,
      users,
    });
  } catch (error: unknown) {
    console.error("Erreur LDAP:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.unbind();
  }
}
