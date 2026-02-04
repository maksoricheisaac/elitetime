"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/security/rbac";
import { AbsenceStatus, AbsenceType } from "@/generated/prisma/enums";
import { createActivityLog } from "@/actions/admin/logs";

export async function approveAbsence(absenceId: string) {
  const auth = await requirePermission("validate_absences")();

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
  const auth = await requirePermission("validate_absences")();

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
  const auth = await requirePermission("validate_absences")();
  const { userId, startDate, endDate, reason } = params;

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
  const auth = await requirePermission("validate_absences")();
  const { id, startDate, endDate, reason } = params;

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
  const auth = await requirePermission("validate_absences")();

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
