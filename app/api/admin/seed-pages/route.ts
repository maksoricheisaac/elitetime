import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser } from "@/lib/session";
import { seedPages } from "@/lib/seed-pages";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Non authentifié. Veuillez vous connecter d'abord." },
        { status: 401 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user) {
      return NextResponse.json(
        { error: "Session invalide ou expirée." },
        { status: 401 }
      );
    }

    const user = sanitizeUser(session.user);

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const result = await seedPages();

    return NextResponse.json({
      success: true,
      message: "Pages et permissions associées initialisées avec succès",
      ...result,
    });
  } catch (error) {
    console.error("Erreur lors de l'initialisation des pages:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'initialisation des pages",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
