import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser } from "@/lib/session";
import { validateAndSanitize, UserIdSchema } from "@/lib/validation/schemas";
import { resetPermissionsToRoleDefaults } from "@/lib/security/rbac";
import { createActivityLog } from "@/actions/admin/logs";

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    throw new Error("Non authentifié");
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user) {
    throw new Error("Session invalide ou expirée");
  }

  const user = sanitizeUser(session.user);

  if (user.role !== "admin") {
    throw new Error("Accès refusé. Réservé aux administrateurs.");
  }

  return { user };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    const { userId } = await params;

    const sanitizedUserId = validateAndSanitize(UserIdSchema, userId);

    const targetUser = await prisma.user.findUnique({
      where: { id: sanitizedUserId },
      select: { id: true, role: true, username: true, firstname: true, lastname: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (targetUser.role === "admin") {
      return NextResponse.json(
        { error: "Impossible de réinitialiser les permissions d'un administrateur" },
        { status: 400 }
      );
    }

    await resetPermissionsToRoleDefaults(targetUser.id, targetUser.role);

    const targetLabel = `${targetUser.firstname || ""} ${targetUser.lastname || ""}`.trim() || targetUser.username;

    await createActivityLog(
      auth.user.id,
      "Réinitialisation des permissions",
      `Permissions de ${targetLabel} (rôle: ${targetUser.role}) réinitialisées selon le rôle`,
      "auth",
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation des permissions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la réinitialisation des permissions",
      },
      { status: 500 }
    );
  }
}
