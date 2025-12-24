"use server";

import prisma from "@/lib/prisma";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

// Liste tous les utilisateurs pour les vues admin (filtrage/pagination côté client pour l'instant)
export async function adminGetAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return users;
}

interface AdminCreateUserInput {
  email: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  role?: UserRole;
  department?: string;
  position?: string;
  avatar?: string | null;
  status?: UserStatus;
}

export async function adminCreateUser(input: AdminCreateUserInput) {
  const {
    email,
    username,
    firstname,
    lastname,
    role = "employee",
    department,
    position,
    avatar = null,
    status = "active",
  } = input;

  const finalUsername =
    username ||
    (email ? email.split("@")[0] : `${firstname || "user"}.${lastname || "new"}`).toLowerCase();

  const user = await prisma.user.create({
    data: {
      email,
      username: finalUsername,
      firstname,
      lastname,
      role,
      department,
      position,
      avatar,
      status,
    },
  });

  return user;
}

interface AdminUpdateUserInput {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  role?: UserRole;
  department?: string | null;
  position?: string | null;
  avatar?: string | null;
  status?: UserStatus;
}

export async function adminUpdateUser(userId: string, data: AdminUpdateUserInput) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return updated;
}

export async function adminDeleteUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });
}
