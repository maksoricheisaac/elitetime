"use server";

import prisma from "@/lib/prisma";
import { PointageStatus } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function upsertManualPointage(
  managerId: string,
  userId: string,
  date: Date,
  entryTime: string | null,
  exitTime: string | null
) {
  if (!managerId || !userId || !date) return null;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.pointage.findFirst({
    where: {
      userId,
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: { date: "desc" },
  });

  let duration = 0;
  const status: PointageStatus = PointageStatus.normal;

  if (entryTime && exitTime) {
    const [eh, em] = entryTime.split(":").map(Number);
    const [xh, xm] = exitTime.split(":").map(Number);
    if (!Number.isNaN(eh) && !Number.isNaN(em) && !Number.isNaN(xh) && !Number.isNaN(xm)) {
      const entry = new Date(dayStart);
      entry.setHours(eh, em, 0, 0);
      const exit = new Date(dayStart);
      exit.setHours(xh, xm, 0, 0);
      const diff = Math.max(0, exit.getTime() - entry.getTime());
      duration = Math.floor(diff / 60000);
    }
  }

  const data = {
    userId,
    date: existing?.date ?? dayStart,
    entryTime,
    exitTime,
    duration,
    status,
    isActive: false,
  } as const;

  if (existing) {
    return prisma.pointage.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.pointage.create({
    data,
  });
}

export async function submitManualPointage(formData: FormData) {
  const managerId = (formData.get("managerId") as string | null)?.trim();
  const userId = (formData.get("userId") as string | null)?.trim();
  const dateStr = (formData.get("date") as string | null)?.trim();
  const entryTime = (formData.get("entryTime") as string | null)?.trim() || null;
  const exitTime = (formData.get("exitTime") as string | null)?.trim() || null;

  if (!managerId || !userId || !dateStr) {
    return;
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return;
  }

  await upsertManualPointage(managerId, userId, date, entryTime, exitTime);

  revalidatePath("/pointages");
  revalidatePath("/pointages/manual");
}
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
