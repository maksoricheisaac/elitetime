"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function createDepartment(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!name) {
    return;
  }

  await prisma.department.create({
    data: {
      name,
      description,
    },
  });

  revalidatePath("/departements");
}

export async function updateDepartment(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!id || !name) {
    return;
  }

  const existing = await prisma.department.findUnique({
    where: { id },
  });

  if (!existing) {
    return;
  }

  await prisma.$transaction([
    prisma.department.update({
      where: { id },
      data: {
        name,
        description,
      },
    }),
    prisma.user.updateMany({
      where: {
        role: "employee",
        department: existing.name,
      },
      data: {
        department: name,
      },
    }),
  ]);

  revalidatePath("/departements");
}

export async function deleteDepartment(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) {
    return;
  }

  const department = await prisma.department.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!department) {
    return;
  }

  const employeesUsingDepartment = await prisma.user.count({
    where: {
      role: "employee",
      status: "active",
      department: department.name,
    },
  });

  if (employeesUsingDepartment > 0) {
    return;
  }

  await prisma.department.delete({ where: { id } });
  revalidatePath("/departements");
}
