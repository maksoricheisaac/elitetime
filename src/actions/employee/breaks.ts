"use server";

import prisma from "@/lib/prisma";

function formatNowToTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5); // HH:mm
}

export async function startEmployeeBreak(userId: string) {
  if (!userId) return null;

  const now = new Date();
  const startTime = formatNowToTime();

  const breakEntry = await prisma.break.create({
    data: {
      userId,
      date: now,
      startTime,
    },
  });

  return breakEntry;
}

export async function endEmployeeBreak(userId: string) {
  if (!userId) return null;

  const now = new Date();

  const activeBreak = await prisma.break.findFirst({
    where: {
      userId,
      endTime: null,
    },
    orderBy: {
      date: "desc",
    },
  });

  if (!activeBreak) return null;

  const todayISO = now.toISOString().split("T")[0];
  const startDate = new Date(`${todayISO}T${activeBreak.startTime}`);
  const endDate = now;
  const duration = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 60000));

  const updated = await prisma.break.update({
    where: { id: activeBreak.id },
    data: {
      endTime: now.toTimeString().slice(0, 5),
      duration,
    },
  });

  return updated;
}

export async function getEmployeeTodayBreaks(userId: string) {
  if (!userId) return [];

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const breaks = await prisma.break.findMany({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return breaks;
}
