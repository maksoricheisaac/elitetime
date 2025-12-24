"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getEmployeeProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  return user;
}

export async function updateEmployeeProfile(
  userId: string,
  data: {
    firstname?: string;
    lastname?: string;
  }
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return updated;
}

export async function updateEmployeeProfileAction(formData: FormData) {
  const userId = formData.get("userId") as string | null;
  const firstname = formData.get("firstname") as string | null;
  const lastname = formData.get("lastname") as string | null;

  if (!userId) {
    throw new Error("Missing userId");
  }

  await updateEmployeeProfile(userId, {
    firstname: firstname ?? undefined,
    lastname: lastname ?? undefined,
  });

  redirect("/profile?updated=1");
}
