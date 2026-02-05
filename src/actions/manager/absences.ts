"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/security/rbac";
import { AbsenceStatus, AbsenceType } from "@/generated/prisma/enums";
import { createActivityLog } from "@/actions/admin/logs";

export async function approveAbsence(absenceId: string) {
  const auth = await requireAnyPermission(["validate_absences", "manage_leaves"])();

  const absence = await prisma.absence.update({
    where: { id: absenceId },
    data: { status: AbsenceStatus.approved },
    include: {
      user: {
        select: { id: true, firstname: true, lastname: true, username: true },
      },
    },
  });

  const user = absence.user;
  const label = `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username;
  const startStr = new Date(absence.startDate).toLocaleDateString("fr-FR");
  const endStr = new Date(absence.endDate).toLocaleDateString("fr-FR");

  await createActivityLog(
    auth.user.id,
    "Validation de congé",
    `${label} – Congé approuvé (${startStr} au ${endStr})`,
    "absence",
  );

  revalidatePath("/conges");
}

export async function rejectAbsence(absenceId: string, comment?: string) {
  const auth = await requireAnyPermission(["validate_absences", "manage_leaves"])();

  const absence = await prisma.absence.update({
    where: { id: absenceId },
    data: {
      status: AbsenceStatus.rejected,
      comment: comment ?? null,
    },
    include: {
      user: {
        select: { id: true, firstname: true, lastname: true, username: true },
      },
    },
  });

  const user = absence.user;
  const label = `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username;
  const startStr = new Date(absence.startDate).toLocaleDateString("fr-FR");
  const endStr = new Date(absence.endDate).toLocaleDateString("fr-FR");

  await createActivityLog(
    auth.user.id,
    "Rejet de congé",
    `${label} – Congé rejeté (${startStr} au ${endStr})${comment ? ` – Motif: ${comment}` : ""}`,
    "absence",
  );

  revalidatePath("/conges");
}

export async function createManagedLeave(params: {
  userId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}) {
  const auth = await requireAnyPermission(["validate_absences", "manage_leaves"])();
  const { userId, startDate, endDate, reason } = params;

  // Empêcher la création d'un congé qui se chevauche avec un autre congé non rejeté pour le même employé
  const overlapping = await prisma.absence.findFirst({
    where: {
      userId,
      type: AbsenceType.conge,
      status: { not: AbsenceStatus.rejected },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) {
    throw new Error("Cet employé a déjà un congé qui chevauche cette période.");
  }

  const absence = await prisma.absence.create({
    data: {
      userId,
      type: AbsenceType.conge,
      startDate,
      endDate,
      reason,
      status: AbsenceStatus.approved,
    },
    include: {
      user: {
        select: { id: true, firstname: true, lastname: true, username: true },
      },
    },
  });

  const user = absence.user;
  const label = `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username;
  const startStr = new Date(absence.startDate).toLocaleDateString("fr-FR");
  const endStr = new Date(absence.endDate).toLocaleDateString("fr-FR");

  await createActivityLog(
    auth.user.id,
    "Création de congé",
    `${label} – Congé créé (${startStr} au ${endStr})`,
    "absence",
  );

  revalidatePath("/conges");
}

export async function updateManagedLeave(params: {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}) {
  const auth = await requireAnyPermission(["validate_absences", "manage_leaves"])();
  const { id, startDate, endDate, reason } = params;

  // Récupérer le congé existant pour connaître l'employé concerné
  const existing = await prisma.absence.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Congé introuvable");
  }

  // Empêcher une mise à jour vers une période qui se chevauche avec un autre congé non rejeté du même employé
  const overlapping = await prisma.absence.findFirst({
    where: {
      id: { not: id },
      userId: existing.userId,
      type: AbsenceType.conge,
      status: { not: AbsenceStatus.rejected },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) {
    throw new Error("Cet employé a déjà un autre congé qui chevauche cette période.");
  }

  const absence = await prisma.absence.update({
    where: { id },
    data: {
      startDate,
      endDate,
      reason,
    },
    include: {
      user: {
        select: { id: true, firstname: true, lastname: true, username: true },
      },
    },
  });

  const user = absence.user;
  const label = `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username;
  const startStr = new Date(absence.startDate).toLocaleDateString("fr-FR");
  const endStr = new Date(absence.endDate).toLocaleDateString("fr-FR");

  await createActivityLog(
    auth.user.id,
    "Modification de congé",
    `${label} – Congé modifié (${startStr} au ${endStr})`,
    "absence",
  );

  revalidatePath("/conges");
}

export async function deleteManagedLeave(absenceId: string) {
  const auth = await requireAnyPermission(["validate_absences", "manage_leaves"])();

  const absence = await prisma.absence.delete({
    where: { id: absenceId },
    include: {
      user: {
        select: { id: true, firstname: true, lastname: true, username: true },
      },
    },
  });

  const user = absence.user;
  const label = `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username;
  const startStr = new Date(absence.startDate).toLocaleDateString("fr-FR");
  const endStr = new Date(absence.endDate).toLocaleDateString("fr-FR");

  await createActivityLog(
    auth.user.id,
    "Suppression de congé",
    `${label} – Congé supprimé (${startStr} au ${endStr})`,
    "absence",
  );

  revalidatePath("/conges");
}
