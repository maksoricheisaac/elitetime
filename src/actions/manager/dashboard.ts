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

interface ManagerPresencePoint {
  date: string;
  presents: number;
  absents: number;
  total: number;
}

interface ManagerRetardPoint {
  date: string;
  retards: number;
  moyenneRetard: number;
}

interface ManagerDashboardChartData {
  presence: ManagerPresencePoint[];
  retards: ManagerRetardPoint[];
}

export async function managerGetDashboardChartData(
  managerId: string,
  fromIso: string,
  toIso: string,
): Promise<ManagerDashboardChartData> {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });

  if (!manager || !manager.department) {
    return { presence: [], retards: [] };
  }

  const team = await prisma.user.findMany({
    where: {
      department: manager.department,
      role: "employee",
    },
    select: { id: true },
  });

  if (team.length === 0) {
    return { presence: [], retards: [] };
  }

  const teamIds = team.map((u) => u.id);

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
      userId: { in: teamIds },
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

  const presentByDay = new Map<string, Set<string>>();
  const retardsByDay = new Map<string, number>();

  for (const p of pointages) {
    const d = new Date(p.date as unknown as string);
    const key = d.toISOString().split("T")[0];

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

  const presence: ManagerPresencePoint[] = [];
  const retards: ManagerRetardPoint[] = [];

  const cursor = new Date(fromStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(toEnd);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0];
    const label = cursor.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

    const presentCount = presentByDay.get(key)?.size ?? 0;
    const totalEmployees = teamIds.length;
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
