"use server";

import { PointageStatus } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/actions/admin/logs";

const DEFAULT_WORK_START_TIME = "08:45";
const DEFAULT_MAX_SESSION_END_TIME = "20:00";
const DEFAULT_BREAK_DURATION_MINUTES = 60;

async function getSystemSettingsOrDefaults() {
  const settings = await prisma.systemSettings.findFirst();

  return {
    workStartTime: settings?.workStartTime ?? DEFAULT_WORK_START_TIME,
    maxSessionEndTime: settings?.maxSessionEndTime ?? DEFAULT_MAX_SESSION_END_TIME,
    breakDuration: settings?.breakDuration ?? DEFAULT_BREAK_DURATION_MINUTES,
  };
}

function parseTimeToHM(value: string): [number, number] {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return [0, 0];
  }

  return [h, m];
}

export async function getEmployeeRecentPointages(userId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId,
      date: {
        gte: since,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  return pointages;
}

export async function getEmployeeWeekStats(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId,
      date: {
        gte: since,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  const totalMinutes = pointages.reduce((sum, p) => sum + p.duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const lates = pointages.filter((p) => p.status === "late").length;
  const overtime = Math.max(0, hours - 40);

  return {
    hours,
    lates,
    overtime,
  };
}

export async function getEmployeeTodayPointage(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const pointage = await prisma.pointage.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  if (pointage && pointage.isActive && pointage.entryTime) {
    const entryDate = new Date(pointage.date);
    const [h, m] = pointage.entryTime.split(":");
    entryDate.setHours(Number(h), Number(m), 0, 0);

    const { maxSessionEndTime } = await getSystemSettingsOrDefaults();
    const [maxH, maxM] = parseTimeToHM(maxSessionEndTime);

    const cutoff = new Date(entryDate);
    cutoff.setHours(maxH, maxM, 0, 0);

    if (now > cutoff) {
      const closed = await endEmployeePointage(userId);
      return closed ?? pointage;
    }
  }

  return pointage;
}

export async function startEmployeePointage(userId: string) {
  if (!userId) return null;

  const existingActive = await prisma.pointage.findFirst({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  if (existingActive) {
    const now = new Date();
    const activeDate = new Date(existingActive.date as unknown as string);

    const sameDay = now.toDateString() === activeDate.toDateString();

    // Si le pointage actif est sur un jour précédent, on le clôt automatiquement
    if (!sameDay) {
      const { maxSessionEndTime, breakDuration } = await getSystemSettingsOrDefaults();
      const [maxH, maxM] = parseTimeToHM(maxSessionEndTime);

      const cutoff = new Date(activeDate);
      cutoff.setHours(maxH, maxM, 0, 0);

      if (existingActive.entryTime) {
        const entryDate = new Date(existingActive.date as unknown as string);
        const [h, m] = existingActive.entryTime.split(":");
        entryDate.setHours(Number(h), Number(m), 0, 0);

        let endDate = cutoff;
        if (entryDate > cutoff) {
          endDate = entryDate;
        }

        const exitTime = endDate.toTimeString().slice(0, 5);

        let durationMinutes = Math.max(
          0,
          Math.floor((endDate.getTime() - entryDate.getTime()) / 60000),
        );

        if (durationMinutes > breakDuration) {
          durationMinutes -= breakDuration;
        }

        await prisma.pointage.update({
          where: { id: existingActive.id },
          data: {
            exitTime,
            duration: durationMinutes,
            isActive: false,
          },
        });
      } else {
        // Pas d'heure d'entrée : on se contente de désactiver le pointage
        await prisma.pointage.update({
          where: { id: existingActive.id },
          data: {
            isActive: false,
          },
        });
      }
      // On continue ensuite pour créer un nouveau pointage pour aujourd'hui
    } else {
      // Même jour : on renvoie simplement le pointage actif existant
      return existingActive;
    }
  }

  const now = new Date();
  const entryTime = now.toTimeString().slice(0, 5); // HH:mm

  const { workStartTime } = await getSystemSettingsOrDefaults();
  const [startHour, startMinute] = parseTimeToHM(workStartTime);

  const isLate =
    now.getHours() > startHour ||
    (now.getHours() === startHour && now.getMinutes() > startMinute);

  const status = isLate ? PointageStatus.late : PointageStatus.normal;

  const pointage = await prisma.pointage.create({
    data: {
      userId,
      date: now,
      entryTime,
      exitTime: null,
      duration: 0,
      status,
      isActive: true,
    },
  });

  // Get user info for logging
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user) {
    const statusLabel = status === PointageStatus.late ? "en retard" : "à l'heure";
    await createActivityLog(
      userId,
      "Pointage d'entrée",
      `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username + ` - ${entryTime} (${statusLabel})`,
      "pointage"
    );
  }
  
  return pointage;
}

export async function endEmployeePointage(userId: string) {
  if (!userId) return null;

  const now = new Date();
  const active = await prisma.pointage.findFirst({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  if (!active || !active.entryTime) {
    return null;
  }

  const entryDate = new Date(active.date);
  const [h, m] = active.entryTime.split(":");
  entryDate.setHours(Number(h), Number(m), 0, 0);

  const { maxSessionEndTime, breakDuration } = await getSystemSettingsOrDefaults();
  const [maxH, maxM] = parseTimeToHM(maxSessionEndTime);

  const cutoff = new Date(entryDate);
  cutoff.setHours(maxH, maxM, 0, 0);

  let endDate = now > cutoff ? cutoff : now;

  if (entryDate > cutoff) {
    endDate = entryDate;
  }

  const exitTime = endDate.toTimeString().slice(0, 5); // HH:mm

  let durationMinutes = Math.max(
    0,
    Math.floor((endDate.getTime() - entryDate.getTime()) / 60000),
  );

  // Retirer la durée de pause théorique si la durée est suffisante
  if (durationMinutes > breakDuration) {
    durationMinutes -= breakDuration;
  }

  const updated = await prisma.pointage.update({
    where: { id: active.id },
    data: {
      exitTime,
      duration: durationMinutes,
      isActive: false,
    },
  });

  // Get user info for logging
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user) {
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationStr = `${hours}h${mins}m`;
    await createActivityLog(
      userId,
      "Pointage de sortie",
      `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username + ` - ${exitTime} (durée: ${durationStr})`,
      "pointage"
    );
  }

  return updated;
}
