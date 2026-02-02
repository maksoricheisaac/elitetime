"use server";

import prisma from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

export async function getAdminDashboardStats() {
  const [users, todayActivePointages, recentActivity] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: { not: 'deleted' },
      },
    }),
    prisma.pointage.count({
      where: {
        isActive: true,
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
      include: { user: true },
    }),
  ]);

  // Ne compter que les utilisateurs actifs (hors supprimés)
  const activeUsers = users.filter((u) => u.status === "active");
  const totalUsers = activeUsers.length;

  const countByRole: Record<UserRole, number> = {
    admin: 0,
    manager: 0,
    team_lead: 0,
    employee: 0,
  };

  const departments = new Map<string, number>();
  let unassignedCount = 0;

  for (const user of activeUsers) {
    countByRole[user.role] = (countByRole[user.role] || 0) + 1;
    if (user.department) {
      departments.set(user.department, (departments.get(user.department) || 0) + 1);
    } else {
      unassignedCount++;
    }
  }

  // Ajouter les non-affectés à la liste des départements
  if (unassignedCount > 0) {
    departments.set("Non affectés", unassignedCount);
  }

  return {
    totalUsers,
    employees: countByRole.employee,
    managers: countByRole.manager,
    admins: countByRole.admin,
    activeToday: todayActivePointages,
    departments: Array.from(departments.entries()).map(([name, count]) => ({ name, count })),
    recentActivity: recentActivity,
  };
}

interface AdminPresencePoint {
  date: string;
  presents: number;
  absents: number;
  total: number;
}

interface AdminRetardPoint {
  date: string;
  retards: number;
  moyenneRetard: number;
}

interface AdminDashboardChartData {
  presence: AdminPresencePoint[];
  retards: AdminRetardPoint[];
}

export async function adminGetDashboardChartData(
  fromIso: string,
  toIso: string,
): Promise<AdminDashboardChartData> {
  const employees = await prisma.user.findMany({
    where: {
      role: "employee",
      status: "active",
    },
    select: { id: true },
  });

  if (employees.length === 0) {
    return { presence: [], retards: [] };
  }

  const employeeIds = employees.map((e) => e.id);

  const from = new Date(fromIso);
  const to = new Date(toIso);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { presence: [], retards: [] };
  }

  const fromStart = new Date(from);
  fromStart.setHours(0, 0, 0, 0);
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId: { in: employeeIds },
      date: {
        gte: fromStart,
        lte: toEnd,
      },
    },
    select: {
      userId: true,
      date: true,
      status: true,
    },
  });

  // Regrouper les pointages par "jour" en se basant sur la date locale
  // (toDateString) pour être cohérent avec le front (/pointages, dashboards).
  const presentByDay = new Map<string, Set<string>>();
  const retardsByDay = new Map<string, number>();

  for (const p of pointages) {
    const d = new Date(p.date as unknown as string);
    d.setHours(0, 0, 0, 0);
    const key = d.toDateString();

    let set = presentByDay.get(key);
    if (!set) {
      set = new Set<string>();
      presentByDay.set(key, set);
    }
    set.add(p.userId);

    if (p.status === "late") {
      retardsByDay.set(key, (retardsByDay.get(key) ?? 0) + 1);
    }
  }

  const presence: AdminPresencePoint[] = [];
  const retards: AdminRetardPoint[] = [];

  const cursor = new Date(fromStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(toEnd);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const key = cursor.toDateString();
    const label = cursor.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

    const presentCount = presentByDay.get(key)?.size ?? 0;
    const totalEmployees = employeeIds.length;
    const absents = Math.max(0, totalEmployees - presentCount);

    presence.push({
      date: label,
      presents: presentCount,
      absents,
      total: presentCount + absents,
    });

    const dayRetards = retardsByDay.get(key) ?? 0;
    retards.push({
      date: label,
      retards: dayRetards,
      moyenneRetard: 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return { presence, retards };
}
