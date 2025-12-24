"use server";

import prisma from "@/lib/prisma";
import type { User, Pointage } from "@/generated/prisma/client";

interface ManagerReportsData {
  team: User[];
  pointages: Pointage[];
  overtimeThreshold: number;
}

export async function managerGetReportsData(managerId: string): Promise<ManagerReportsData> {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });

  if (!manager || !manager.department) {
    const settings = await prisma.systemSettings.findFirst();
    const overtimeThreshold = settings?.overtimeThreshold ?? 40;
    return { team: [], pointages: [], overtimeThreshold };
  }

  const team = await prisma.user.findMany({
    where: {
      department: manager.department,
      role: "employee",
      status: "active",
    },
    orderBy: { firstname: "asc" },
  });

  if (team.length === 0) {
    const settings = await prisma.systemSettings.findFirst();
    const overtimeThreshold = settings?.overtimeThreshold ?? 40;
    return { team, pointages: [], overtimeThreshold };
  }

  const teamIds = team.map((u) => u.id);

  // On récupère les pointages des 90 derniers jours pour couvrir semaine / mois / trimestre
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId: { in: teamIds },
      date: {
        gte: since,
      },
    },
    orderBy: { date: "desc" },
  });

  const settings = await prisma.systemSettings.findFirst();
  const overtimeThreshold = settings?.overtimeThreshold ?? 40;

  return { team, pointages, overtimeThreshold };
}
