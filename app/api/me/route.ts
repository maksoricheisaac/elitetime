import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { 
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstname: true,
            lastname: true,
            role: true,
            department: true,
            position: true,
            avatar: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    if (session.user.status !== 'active') {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const safeUser = sanitizeUser(session.user);

    return NextResponse.json({ user: safeUser }, { status: 200 });
  } catch (error) {
    console.error("[API /me] Erreur:", error);
    return NextResponse.json(
      { error: "Service temporairement indisponible" },
      { status: 500 }
    );
  }
}
