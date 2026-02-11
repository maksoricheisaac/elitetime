import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { createGlobalPointagesReportPdf } from "@/lib/reports/pdf-global-pointages-report";
import type { DailyReportMode, ScheduledEmailType } from "@/generated/prisma/client";

function getDailyPeriod(mode: DailyReportMode): { from: Date; to: Date; label: string } {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);

  if (mode === "TODAY") {
    // Today
  } else {
    // YESTERDAY
    from.setDate(from.getDate() - 1);
    to.setDate(to.getDate() - 1);
  }

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const label = from.toLocaleDateString("fr-FR");
  return { from, to, label };
}

function getLastWeekPeriod(): { from: Date; to: Date; label: string } {
  const now = new Date();
  // 0 = Sunday, 1 = Monday, ...
  const day = now.getDay();
  const diffToMondayThisWeek = (day + 6) % 7; // days since Monday

  const mondayThisWeek = new Date(now);
  mondayThisWeek.setDate(now.getDate() - diffToMondayThisWeek);
  mondayThisWeek.setHours(0, 0, 0, 0);

  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

  const sundayLastWeek = new Date(mondayLastWeek);
  sundayLastWeek.setDate(mondayLastWeek.getDate() + 6);
  sundayLastWeek.setHours(23, 59, 59, 999);

  const label = `${mondayLastWeek.toLocaleDateString("fr-FR")} – ${sundayLastWeek.toLocaleDateString(
    "fr-FR",
  )}`;
  return { from: mondayLastWeek, to: sundayLastWeek, label };
}

export async function runScheduledEmailJob(jobId: string): Promise<void> {
  const job = await prisma.scheduledEmailJob.findUnique({
    where: { id: jobId },
    include: {
      recipients: {
        include: { user: true },
      },
    },
  });

  if (!job || !job.enabled) {
    console.log(`[scheduled-emails] job ${jobId} not found or disabled`);
    return;
  }

  if (job.type === "WEEKLY_REPORT" && job.weekday != null) {
    const todayWeekday = new Date().getDay();
    if (todayWeekday !== job.weekday) {
      console.log(
        `[scheduled-emails] weekly job ${job.id} skipped (weekday ${todayWeekday} != ${job.weekday})`,
      );
      return;
    }
  }

  const recipients = job.recipients.map((r) => r.user).filter((u) => Boolean(u?.email));
  const to = recipients.map((u) => u.email as string).filter(Boolean);
  if (to.length === 0) {
    console.log(`[scheduled-emails] job ${job.id} has no recipients with email, skipping`);
    return;
  }

  console.log(
    `[scheduled-emails] running ${job.type} (${job.id}) -> recipients=${to.length}`,
  );

  let from: Date;
  let toDate: Date;
  let periodLabel: string;

  if (job.type === "DAILY_REPORT") {
    const settings = await prisma.systemSettings.findFirst();
    const mode: DailyReportMode = settings?.dailyReportMode ?? "YESTERDAY";
    const period = getDailyPeriod(mode);
    from = period.from;
    toDate = period.to;
    periodLabel = period.label;
  } else {
    const period = getLastWeekPeriod();
    from = period.from;
    toDate = period.to;
    periodLabel = period.label;
  }

  const users = await prisma.user.findMany({
    where: {
      status: "active",
    },
  });

  const userIds = users.map((u) => u.id);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId: { in: userIds },
      date: {
        gte: from,
        lte: toDate,
      },
    },
    orderBy: { date: "asc" },
  });

  const breaks = await prisma.break.findMany({
    where: {
      userId: { in: userIds },
      date: {
        gte: from,
        lte: toDate,
      },
    },
    orderBy: { date: "asc" },
  });

  const title: string =
    job.type === "DAILY_REPORT"
      ? `Rapport quotidien des pointages (${periodLabel})`
      : `Rapport hebdomadaire des pointages (${periodLabel})`;

  const pdfBytes = await createGlobalPointagesReportPdf({
    users,
    pointages,
    breaks,
    from,
    to: toDate,
    title,
  });

  const fileNameBase = job.type === "DAILY_REPORT" ? "rapport_quotidien" : "rapport_hebdomadaire";
  const fileName = `${fileNameBase}_${new Date().toISOString().slice(0, 10)}.pdf`;

  console.log(
    `[scheduled-emails] generated PDF (${pdfBytes.byteLength} bytes) for ${job.type} (${job.id})`,
  );

  await sendEmail({
    to,
    subject: title,
    text: title,
    attachments: [
      {
        filename: fileName,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });

  console.log(`[scheduled-emails] email sent for ${job.type} (${job.id}) -> ${to.join(",")}`);
}
