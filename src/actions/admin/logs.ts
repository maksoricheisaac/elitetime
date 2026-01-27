"use server";

import prisma from "@/lib/prisma";
import type { ActivityType } from "@/generated/prisma/enums";

interface ActivityLogsOptions {
  limit?: number;
  from?: string;
  to?: string;
}

export async function adminGetActivityLogs(options?: ActivityLogsOptions) {
  const limit = options?.limit ?? 200;

  let where: { timestamp?: { gte?: Date; lte?: Date } } | undefined;

  if (options?.from || options?.to) {
    const timestamp: { gte?: Date; lte?: Date } = {};

    if (options.from) {
      const fromDate = new Date(options.from);
      fromDate.setHours(0, 0, 0, 0);
      timestamp.gte = fromDate;
    }

    if (options.to) {
      const toDate = new Date(options.to);
      toDate.setHours(23, 59, 59, 999);
      timestamp.lte = toDate;
    }

    where = { timestamp };
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { user: true },
  });

  return logs;
}

export async function adminGetActivityLogsWithEmployees(options?: ActivityLogsOptions) {
  const [logs, employees] = await Promise.all([
    adminGetActivityLogs(options),
    prisma.user.findMany({
      where: {
        role: "employee",
        status: "active",
      },
    }),
  ]);

  return { logs, employees };
}

export async function createActivityLog(
  userId: string,
  action: string,
  details: string,
  type: ActivityType
) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
        type,
        timestamp: new Date(),
      },
      include: { user: true },
    });

    return { success: true, log };
  } catch (error) {
    console.error("Failed to create activity log:", error);
    return { success: false, error };
  }
}
