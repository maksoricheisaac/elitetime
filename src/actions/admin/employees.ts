"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin, logSecurityEvent, grantDefaultManagerPermissions, getAuthenticatedUser } from "@/lib/security/rbac";
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

  const auth = await getAuthenticatedUser();

  const updated = await prisma.user.update({
    where: { id },
    data: {
      firstname,
      lastname,
      email,
      department,
      position,
      role: role as "employee" | "team_lead" | "manager" | "admin",
    },
  });

  if (role === "manager") {
    await grantDefaultManagerPermissions(id);
  }

  await logSecurityEvent(
    auth.user.id,
    "EMPLOYEE_UPDATED",
    `Mise à jour employé: ${updated.username} (id=${updated.id})`,
  );

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

// Marquer un employé comme supprimé (suppression logique)
export async function adminSoftDeleteEmployee(userId: string) {
  const auth = await requireAdmin();

  const trimmedId = userId.trim();
  if (!trimmedId) {
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id: trimmedId },
    select: { id: true, username: true, email: true, status: true },
  });

  if (!existing) {
    return;
  }

  if (existing.id === auth.user.id) {
    // Ne pas permettre à un admin de se supprimer lui-même
    return;
  }

  const archivedUsername = `${existing.username}__deleted__${existing.id}`;
  const archivedEmail = existing.email
    ? `${existing.email}__deleted__${existing.id}`.slice(0, 190)
    : null;

  await prisma.user.update({
    where: { id: trimmedId },
    data: {
      status: "deleted",
      username: archivedUsername,
      email: archivedEmail,
    },
  });

  await logSecurityEvent(
    auth.user.id,
    "USER_SOFT_DELETED",
    `Suppression logique de l'utilisateur ${existing.username} (id=${existing.id})`,
  );

  revalidatePath("/employees");
  redirect("/employees?deleted=1");
}
