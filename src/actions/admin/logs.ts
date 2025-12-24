"use server";

import prisma from "@/lib/prisma";
import type { ActivityType } from "@/generated/prisma/enums";

export async function adminGetActivityLogs(options?: { limit?: number }) {
  const limit = options?.limit ?? 200;

  const logs = await prisma.activityLog.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { user: true },
  });

  return logs;
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
