"use server";

import { AbsenceType } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/actions/admin/logs";

export async function getEmployeeAbsences(userId: string) {
  const absences = await prisma.absence.findMany({
    where: { userId },
    orderBy: {
      startDate: "desc",
    },
  });

  return absences;
}

export async function requestEmployeeAbsence(params: {
  userId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}) {
  const { userId, type, startDate, endDate, reason } = params;

  const absence = await prisma.absence.create({
    data: {
      userId,
      type: type as AbsenceType,
      startDate,
      endDate,
      reason,
      status: "pending",
    },
  });

  // Get user info for logging
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user) {
    const typeLabel = {
      conge: "Congé",
      maladie: "Maladie",
      autre: "Autre",
    }[type] || type;

    const startStr = new Date(startDate).toLocaleDateString("fr-FR");
    const endStr = new Date(endDate).toLocaleDateString("fr-FR");

    await createActivityLog(
      userId,
      "Demande d'absence",
      `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username + ` - ${typeLabel} (${startStr} au ${endStr})`,
      "absence"
    );
  }

  return absence;
}
