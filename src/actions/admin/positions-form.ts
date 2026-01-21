"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function createPositionFromForm(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const departmentId = (formData.get("departmentId") as string | null)?.trim();

  if (!name || !departmentId) {
    return;
  }

  await prisma.position.create({
    data: {
      name,
      description,
      departmentId,
    },
  });

  revalidatePath("/postes");
}

export async function updatePositionFromForm(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const departmentId = (formData.get("departmentId") as string | null)?.trim();

  if (!id || !name || !departmentId) {
    return;
  }

  await prisma.position.update({
    where: { id },
    data: {
      name,
      description,
      departmentId,
    },
  });

  revalidatePath("/postes");
}

export async function deletePositionFromForm(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) {
    return;
  }

  await prisma.position.delete({
    where: { id },
  });

  revalidatePath("/postes");
}
