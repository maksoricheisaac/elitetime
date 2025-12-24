"use server";

import prisma from "@/lib/prisma";
import type { User, Pointage, Absence } from "@/generated/prisma/client";

interface ManagerPointagesData {
  team: User[];
  pointages: Pointage[];
  absences: Absence[];
}

export async function managerGetPointagesData(managerId: string): Promise<ManagerPointagesData> {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });

  if (!manager || !manager.department) {
    return { team: [], pointages: [], absences: [] };
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
    return { team, pointages: [], absences: [] };
  }

  const teamIds = team.map((u) => u.id);

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId: { in: teamIds },
      date: {
        gte: since,
      },
    },
    orderBy: { date: "desc" },
  });

  const absences = await prisma.absence.findMany({
    where: {
      userId: { in: teamIds },
    },
    orderBy: { startDate: "desc" },
  });

  return { team, pointages, absences };
}
