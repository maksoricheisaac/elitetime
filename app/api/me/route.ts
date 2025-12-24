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
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const safeUser = sanitizeUser(session.user);

    return NextResponse.json({ user: safeUser }, { status: 200 });
  } catch (error) {
    console.error("/api/me error:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
