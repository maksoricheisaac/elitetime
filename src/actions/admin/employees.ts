"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export async function updateEmployee(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  const firstname = (formData.get("firstname") as string | null)?.trim() || null;
  const lastname = (formData.get("lastname") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.trim() || null;

  const rawDepartment = (formData.get("department") as string | null)?.trim();
  const department = !rawDepartment || rawDepartment === "__none" ? null : rawDepartment;

  const rawPosition = (formData.get("position") as string | null)?.trim();
  const position = !rawPosition || rawPosition === "__none" ? null : rawPosition;
  const role = (formData.get("role") as string | null)?.trim() || "employee";
  const status = (formData.get("status") as string | null)?.trim() || "active";

  if (!id) {
    return;
  }

  await prisma.user.update({
    where: { id },
    data: {
      firstname,
      lastname,
      email,
      department,
      position,
      role: role as "employee" | "manager" | "admin",
      status: status as "active" | "inactive",
    },
  });

  revalidatePath("/employees");
  redirect("/employees?updated=1");
}
