"use server";

import prisma from "@/lib/prisma";
import { requireAdmin, logSecurityEvent } from "@/lib/security/rbac";
import { z } from "zod";

const WeekdaySchema = z.number().int().min(0).max(6);

const UpdateEmailSchedulingSchema = z.object({
  daily: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    recipientUserIds: z.array(z.string()).max(200),
  }),
  weekly: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    weekday: WeekdaySchema,
    recipientUserIds: z.array(z.string()).max(200),
  }),
});

export async function adminGetEmailScheduling() {
  await requireAdmin();

  const eligibleUsers = await prisma.user.findMany({
    where: {
      status: "active",
      role: { in: ["admin", "manager"] },
      email: { not: null },
    },
    orderBy: [{ role: "asc" }, { firstname: "asc" }],
    select: {
      id: true,
      username: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
    },
  });

  const jobs = await prisma.scheduledEmailJob.findMany({
    where: { type: { in: ["DAILY_REPORT", "WEEKLY_REPORT"] } },
    include: { recipients: true },
  });

  const dailyJob = jobs.find((j) => j.type === "DAILY_REPORT") ?? null;
  const weeklyJob = jobs.find((j) => j.type === "WEEKLY_REPORT") ?? null;

  return {
    eligibleUsers,
    daily: dailyJob
      ? {
          id: dailyJob.id,
          enabled: dailyJob.enabled,
          hour: dailyJob.hour,
          minute: dailyJob.minute,
          recipientUserIds: dailyJob.recipients.map((r) => r.userId),
        }
      : null,
    weekly: weeklyJob
      ? {
          id: weeklyJob.id,
          enabled: weeklyJob.enabled,
          hour: weeklyJob.hour,
          minute: weeklyJob.minute,
          weekday: weeklyJob.weekday ?? 1,
          recipientUserIds: weeklyJob.recipients.map((r) => r.userId),
        }
      : null,
  };
}

export async function adminUpdateEmailScheduling(input: unknown) {
  const auth = await requireAdmin();
  const data = UpdateEmailSchedulingSchema.parse(input);

  const eligibleIds = new Set(
    (
      await prisma.user.findMany({
        where: {
          status: "active",
          role: { in: ["admin", "manager"] },
          email: { not: null },
        },
        select: { id: true },
      })
    ).map((u) => u.id),
  );

  const dailyRecipientIds = data.daily.recipientUserIds.filter((id) => eligibleIds.has(id));
  const weeklyRecipientIds = data.weekly.recipientUserIds.filter((id) => eligibleIds.has(id));

  const [dailyJob, weeklyJob] = await prisma.$transaction([
    prisma.scheduledEmailJob.upsert({
      where: { type: "DAILY_REPORT" },
      update: {
        hour: data.daily.hour,
        minute: data.daily.minute,
        enabled: true,
        weekday: null,
      },
      create: {
        type: "DAILY_REPORT",
        hour: data.daily.hour,
        minute: data.daily.minute,
        enabled: true,
      },
    }),
    prisma.scheduledEmailJob.upsert({
      where: { type: "WEEKLY_REPORT" },
      update: {
        hour: data.weekly.hour,
        minute: data.weekly.minute,
        weekday: data.weekly.weekday,
        enabled: true,
      },
      create: {
        type: "WEEKLY_REPORT",
        hour: data.weekly.hour,
        minute: data.weekly.minute,
        weekday: data.weekly.weekday,
        enabled: true,
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.scheduledEmailJobRecipient.deleteMany({ where: { jobId: dailyJob.id } }),
    prisma.scheduledEmailJobRecipient.createMany({
      data: dailyRecipientIds.map((userId) => ({ jobId: dailyJob.id, userId })),
      skipDuplicates: true,
    }),
    prisma.scheduledEmailJobRecipient.deleteMany({ where: { jobId: weeklyJob.id } }),
    prisma.scheduledEmailJobRecipient.createMany({
      data: weeklyRecipientIds.map((userId) => ({ jobId: weeklyJob.id, userId })),
      skipDuplicates: true,
    }),
  ]);

  await logSecurityEvent(
    auth.user.id,
    "EMAIL_SCHEDULING_UPDATED",
    "Mise à jour des paramètres d'envoi des rapports (quotidien/hebdomadaire)",
  );

  return {
    daily: {
      id: dailyJob.id,
      hour: dailyJob.hour,
      minute: dailyJob.minute,
      recipientUserIds: dailyRecipientIds,
    },
    weekly: {
      id: weeklyJob.id,
      hour: weeklyJob.hour,
      minute: weeklyJob.minute,
      weekday: weeklyJob.weekday ?? data.weekly.weekday,
      recipientUserIds: weeklyRecipientIds,
    },
  };
}
