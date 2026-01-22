import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser } from "@/lib/session";
import { syncEmployeesFromLdapCore } from "@/lib/ldap-sync-employees";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Non authentifié. Veuillez vous connecter d'abord." },
        { status: 401 },
      );
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user) {
      return NextResponse.json(
        { error: "Session invalide ou expirée." },
        { status: 401 },
      );
    }

    const user = sanitizeUser(session.user);

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs." },
        { status: 403 },
      );
    }

    const settings = await prisma.systemSettings.findFirst({
      select: {
        id: true,
        ldapSyncEnabled: true,
        ldapSyncIntervalMinutes: true,
        ldapLastSyncAt: true,
      },
    });

    if (!settings || !settings.ldapSyncEnabled) {
      return NextResponse.json(
        { error: "La synchronisation LDAP est désactivée dans les paramètres système." },
        { status: 400 },
      );
    }

    const now = new Date();

    if (settings.ldapLastSyncAt) {
      const diffMs = now.getTime() - settings.ldapLastSyncAt.getTime();
      const diffMinutes = diffMs / 60000;
      if (diffMinutes < settings.ldapSyncIntervalMinutes) {
        const remaining = Math.ceil(settings.ldapSyncIntervalMinutes - diffMinutes);
        return NextResponse.json(
          {
            error: "Intervalle minimal entre deux synchronisations non atteint.",
            remainingMinutes: remaining,
          },
          { status: 429 },
        );
      }
    }

    const { syncedCount } = await syncEmployeesFromLdapCore();

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { ldapLastSyncAt: now },
    });

    return NextResponse.json({
      success: true,
      syncedCount,
      lastSyncAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors de la synchronisation LDAP (API admin):", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la synchronisation LDAP.",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
