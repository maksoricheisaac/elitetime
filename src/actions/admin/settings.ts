"use server";

import prisma from "@/lib/prisma";
import type { SystemSettings } from "@/generated/prisma/client";

const SYSTEM_SETTINGS_ID = 1;

export async function adminGetSystemSettings(): Promise<SystemSettings> {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: SYSTEM_SETTINGS_ID },
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: SYSTEM_SETTINGS_ID,
        workStartTime: "08:45",
        workEndTime: "17:30",
        maxSessionEndTime: "20:00",
        breakDuration: 60,
        overtimeThreshold: 8,
        holidays: [],
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        lateAlertsEnabled: true,
        pointageRemindersEnabled: true,
      },
    });
  }

  return settings;
}

export async function adminUpdateSystemSettings(data: {
  workStartTime?: string;
  workEndTime?: string;
  maxSessionEndTime?: string;
  breakDuration?: number;
  overtimeThreshold?: number;
  holidays?: string[];
  notificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  lateAlertsEnabled?: boolean;
  pointageRemindersEnabled?: boolean;
}) {
  const settings = await prisma.systemSettings.update({
    where: { id: SYSTEM_SETTINGS_ID },
    data,
  });

  return settings;
}
