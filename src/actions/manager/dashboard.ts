"use server";

import prisma from "@/lib/prisma";
import type { User, Pointage } from "@/generated/prisma/client";

interface ManagerDashboardStats {
  team: User[];
  todayPointages: (Pointage & { user: User })[];
}

export async function managerGetDashboardStats(managerId: string): Promise<ManagerDashboardStats> {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });

  if (!manager || !manager.department) {
    return { team: [], todayPointages: [] };
  }

  const team = await prisma.user.findMany({
    where: {
      department: manager.department,
      role: "employee",
    },
    orderBy: { firstname: "asc" },
  });

  if (team.length === 0) {
    return { team, todayPointages: [] };
  }

  const teamIds = team.map((u) => u.id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayPointages = await prisma.pointage.findMany({
    where: {
      userId: { in: teamIds },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { date: "desc" },
    include: { user: true },
  });

  return { team, todayPointages };
}
