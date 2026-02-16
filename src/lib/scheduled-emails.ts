import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderPointagesReportHtml } from "@/lib/reports/pointages-report-template";
import { renderPdfFromHtml } from "@/lib/reports/html-to-pdf";
import type { DailyReportMode } from "@/generated/prisma/client";
import { formatMinutesHuman } from "@/lib/time-format";

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

  const breaksByUser = new Map<string, { startTimes: string[]; endTimes: string[] }>();
  for (const b of breaks) {
    const startTime = b.startTime ?? "";
    const endTime = b.endTime ?? "";
    if (!startTime && !endTime) continue;

    const current = breaksByUser.get(b.userId) ?? { startTimes: [], endTimes: [] };
    if (startTime) current.startTimes.push(startTime);
    if (endTime) current.endTimes.push(endTime);
    breaksByUser.set(b.userId, current);
  }

  const pointagesByUser = new Map<string, { entry: string; exit: string }>();
  const workMinutesByUser = new Map<string, number>();
  for (const p of pointages) {
    const current = pointagesByUser.get(p.userId) ?? { entry: "", exit: "" };
    if (p.entryTime) current.entry = p.entryTime;
    if (p.exitTime) current.exit = p.exitTime;
    pointagesByUser.set(p.userId, current);

    if (typeof p.duration === "number") {
      workMinutesByUser.set(p.userId, (workMinutesByUser.get(p.userId) ?? 0) + p.duration);
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aName = `${a.firstname ?? ""} ${a.lastname ?? ""}`.trim().toLowerCase();
    const bName = `${b.firstname ?? ""} ${b.lastname ?? ""}`.trim().toLowerCase();
    return aName.localeCompare(bName);
  });

  const breakMinutesByUser = new Map<string, number>();
  for (const b of breaks) {
    if (typeof b.duration === "number") {
      breakMinutesByUser.set(b.userId, (breakMinutesByUser.get(b.userId) ?? 0) + b.duration);
    }
  }

  const rows = sortedUsers.map((u) => {
    const fullName = `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim();
    const position = u.position ?? u.department ?? "";
    const times = pointagesByUser.get(u.id);
    const userBreaks = breaksByUser.get(u.id);

    const totalBreakMinutes = breakMinutesByUser.get(u.id) ?? 0;
    const totalWorkMinutes = workMinutesByUser.get(u.id) ?? 0;

    const startTimes = (userBreaks?.startTimes ?? []).slice().sort();
    const endTimes = (userBreaks?.endTimes ?? []).slice().sort();

    return {
      fullName,
      position,
      checkIn: times?.entry ?? "",
      checkOut: times?.exit ?? "",
      breakStart: startTimes[0] ?? "",
      breakEnd: endTimes.length > 0 ? endTimes[endTimes.length - 1] : "",
      breakDuration: totalBreakMinutes > 0 ? formatMinutesHuman(totalBreakMinutes) : "",
      workDuration: totalWorkMinutes > 0 ? formatMinutesHuman(totalWorkMinutes) : "",
    };
  });

  const html = renderPointagesReportHtml({
    periodLabel,
    generatedAtLabel: new Date().toLocaleString("fr-FR"),
    rows,
  });

  const pdfBytes = await renderPdfFromHtml({ html });

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
