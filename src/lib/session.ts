import type { User } from "@/generated/prisma/client";

export const SESSION_COOKIE_NAME = "elitetime_session";
export const SESSION_MAX_AGE = 60 * 60 * 24;

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const sessionCookieOptions = {
  ...baseCookieOptions,
  maxAge: SESSION_MAX_AGE,
};

export type SafeUser = User;

export const sanitizeUser = (user: User): SafeUser => {
  return user;
};

export const getDashboardPath = (role?: string | null) => {
  void role;
  return "/dashboard";
};
