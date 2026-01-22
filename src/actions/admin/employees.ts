"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin, logSecurityEvent } from "@/lib/security/rbac";
import { syncEmployeesFromLdapCore } from "@/lib/ldap-sync-employees";

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
    },
  });

  revalidatePath("/employees");
  redirect("/employees?updated=1");
}

// Synchronisation des employés depuis l'annuaire LDAP/AD (déclenchée manuellement depuis l'UI)
export async function syncEmployeesFromLdap() {
  const auth = await requireAdmin();

  let success = false;

  try {
    const { syncedCount } = await syncEmployeesFromLdapCore();

    await logSecurityEvent(
      auth.user.id,
      "LDAP_SYNC_EMPLOYEES",
      `Synchronisation LDAP des employés (${syncedCount} entrées traitées)`,
    );

    success = true;
  } catch (error) {
    await logSecurityEvent(
      auth.user.id,
      "LDAP_SYNC_EMPLOYEES_ERROR",
      `Erreur lors de la synchronisation LDAP des employés: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  revalidatePath("/employees");
  if (success) {
    redirect("/employees?synced=1");
  } else {
    redirect("/employees?synced_error=1");
  }
}
