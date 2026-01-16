import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser } from "@/lib/session";
import { grantPermission, revokePermission } from "@/lib/security/rbac";
import { validateAndSanitize, UserIdSchema } from "@/lib/validation/schemas";

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

  if (user.role !== 'admin') {
    throw new Error("Accès refusé. Réservé aux administrateurs.");
  }

  return { user };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    const { permissionId } = await request.json();
    const { userId } = await params; // Récupérer les params de manière asynchrone

    const sanitizedUserId = validateAndSanitize(UserIdSchema, userId);
    
    if (!permissionId || typeof permissionId !== 'string') {
      return NextResponse.json(
        { error: "Permission ID invalide" },
        { status: 400 }
      );
    }

    await grantPermission(sanitizedUserId, permissionId, auth.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'attribution de permission:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'attribution de permission" },
      { status: error instanceof Error && error.message.includes("Non authentifié") ? 401 : 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await getAuthenticatedAdmin(); // Vérification d'authentification
    
    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('permissionId');
    const { userId } = await params; // Récupérer les params de manière asynchrone
    
    const sanitizedUserId = validateAndSanitize(UserIdSchema, userId);
    
    if (!permissionId || typeof permissionId !== 'string') {
      return NextResponse.json(
        { error: "Permission ID invalide" },
        { status: 400 }
      );
    }

    await revokePermission(sanitizedUserId, permissionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la révocation de permission:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la révocation de permission" },
      { status: error instanceof Error && error.message.includes("Non authentifié") ? 401 : 500 }
    );
  }
}
