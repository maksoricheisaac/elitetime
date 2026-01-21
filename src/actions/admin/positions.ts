"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function getPositionsByDepartment(departmentId: string) {
  const positions = await prisma.position.findMany({
    where: { departmentId },
    orderBy: { name: 'asc' },
  });
  return positions;
}

export async function getAllPositions() {
  const positions = await prisma.position.findMany({
    include: { department: true },
    orderBy: { name: 'asc' },
  });
  return positions;
}

export async function createPosition(
  name: string,
  departmentId: string,
  description?: string
) {
  const position = await prisma.position.create({
    data: {
      name,
      departmentId,
      description,
    },
    include: { department: true },
  });
  return position;
}

export async function updatePosition(
  positionId: string,
  name: string,
  departmentId: string,
  description?: string
) {
  const position = await prisma.position.update({
    where: { id: positionId },
    data: {
      name,
      departmentId,
      description,
    },
    include: { department: true },
  });
  return position;
}

export async function deletePosition(positionId: string) {
  await prisma.position.delete({
    where: { id: positionId },
  });
}

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
