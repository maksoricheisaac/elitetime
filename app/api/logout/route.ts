import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";
import { createActivityLog } from "@/actions/admin/logs";

export async function POST(req: Request) {
  const token = req.headers.get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (token) {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
      });

      if (session && session.user) {
        // Log the logout activity
        await createActivityLog(
          session.user.id,
          "Déconnexion",
          `${session.user.firstname || ""} ${session.user.lastname || ""}`.trim() || session.user.username,
          "auth"
        );
      }

      await prisma.session.delete({
        where: { sessionToken: token },
      });
    } catch {
      // ignore if session not found
    }
  }

  const response = NextResponse.json({ success: true }, { status: 200 });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });

  return response;
}