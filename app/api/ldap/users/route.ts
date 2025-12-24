import { NextResponse } from "next/server";
import { Client } from "ldapts";

export async function GET() {
  const url = process.env.LDAP_URL as string
  const bindDN =process.env.LDAP_BIND_DN as string
  const password = process.env.LDAP_PWD as string
  const baseDN = process.env.LDAP_BASE_DN as string

  const client = new Client({
    url,
    tlsOptions: { rejectUnauthorized: false },
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    // 1️⃣ Connexion
    await client.bind(bindDN, password);

    // 2️⃣ Recherche LDAP
    const { searchEntries } = await client.search(baseDN, {
      scope: "sub",
      filter: "(&(objectClass=user)(!(sAMAccountName=*$)))", // ✅ ignore comptes ordinateurs
      attributes: ["cn", "sAMAccountName", "mail", "givenName", "sn"],
    });

    // 3️⃣ Filtrer les comptes système connus côté Node.js (optionnel)
    const users = searchEntries.filter(
      u => !["krbtgt", "Administrateur", "Invité"].includes(u.sAMAccountName)
    );

    return NextResponse.json({
      count: users.length,
      users,
    });
  } catch (error: any) {
    console.error("Erreur LDAP:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await client.unbind();
  }
}
