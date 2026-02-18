import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, getUserPermissions } from "@/lib/security/rbac";
import { renderPointagesEmployeeReportHtml, renderPointagesReportHtml } from "@/lib/reports/pointages-report-template";
import { renderPdfFromHtml } from "@/lib/reports/html-to-pdf";
import { formatMinutesHuman } from "@/lib/time-format";
import { formatTimeToHHMM } from "@/lib/time-format";

export const dynamic = "force-dynamic";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDayBounds(date: Date): { from: Date; to: Date } {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function normalizeTime(value: string | null | undefined): string {
  return formatTimeToHHMM(value) || "";
}

function toLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(value: string): number | null {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatMinutesHHMM(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser();

    const url = new URL(req.url);
    const fromParam = parseDateParam(url.searchParams.get("from"));
    const toParam = parseDateParam(url.searchParams.get("to"));
    const employeeId = url.searchParams.get("employeeId");

    const today = new Date();
    const defaultBounds = toDayBounds(today);

    const from = fromParam ? toDayBounds(fromParam).from : defaultBounds.from;
    const to = toParam ? toDayBounds(toParam).to : defaultBounds.to;

    const permissions = await getUserPermissions(auth.user.id);
    const permissionSet = new Set(permissions.map((p) => p.name));

    const isAdminOrManager = ["admin", "manager"].includes(auth.user.role);
    const canViewAll = permissionSet.has("view_all_pointages") || isAdminOrManager;
    const canViewTeam = permissionSet.has("view_team_pointages") || isAdminOrManager;

    // Team scope if employeeId not provided.
    const isTeamReport = !employeeId;

    // Resolve which users are included in the report.
    let users;

    if (!isTeamReport) {
      // Single employee report.
      if (employeeId !== auth.user.id && !canViewTeam && !canViewAll) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      const whereUser: NonNullable<
        NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"]
      > = {
        id: employeeId,
      };

      users = await prisma.user.findMany({
        where: whereUser,
      });

      if (users.length > 0 && users[0].hiddenFromLists && employeeId !== auth.user.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    } else {
      // Team/global report.
      if (!canViewTeam && !canViewAll) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      const whereUser: NonNullable<
        NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"]
      > = {
        role: { in: ["employee", "team_lead"] },
        hiddenFromLists: false,
      };

      // If the user only has team access, we scope to their department.
      if (!canViewAll && auth.user.department) {
        whereUser.department = auth.user.department;
      }

      users = await prisma.user.findMany({
        where: whereUser,
        orderBy: { firstname: "asc" },
      });
    }

    const userIds = users.map((u) => u.id);

    const [pointages, breaks] = await Promise.all([
      prisma.pointage.findMany({
        where: {
          userId: { in: userIds },
          date: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.break.findMany({
        where: {
          userId: { in: userIds },
          date: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    if (!isTeamReport) {
      const user = users[0];
      const position = user?.position ?? user?.department ?? "";

      const settings = await prisma.systemSettings.findFirst();
      const workStartTime = settings?.workStartTime ?? "08:45";
      const workStartMinutes = parseTimeToMinutes(workStartTime) ?? 0;

      const breaksByDay = new Map<string, { startTimes: string[]; endTimes: string[]; minutes: number }>();
      for (const b of breaks) {
        const dayKey = toLocalDayKey(b.date);
        const current = breaksByDay.get(dayKey) ?? { startTimes: [], endTimes: [], minutes: 0 };
        if (b.startTime) current.startTimes.push(b.startTime);
        if (b.endTime) current.endTimes.push(b.endTime);
        if (typeof b.duration === "number") current.minutes += b.duration;
        breaksByDay.set(dayKey, current);
      }

      const pointagesByDay = new Map<string, { entry: string; exit: string; minutes: number }>();
      for (const p of pointages) {
        const dayKey = toLocalDayKey(p.date);
        const current = pointagesByDay.get(dayKey) ?? { entry: "", exit: "", minutes: 0 };
        if (p.entryTime) current.entry = p.entryTime;
        if (p.exitTime) current.exit = p.exitTime;
        if (typeof p.duration === "number") current.minutes += p.duration;
        pointagesByDay.set(dayKey, current);
      }

      const dayKeys = new Set<string>([...breaksByDay.keys(), ...pointagesByDay.keys()]);
      const sortedDayKeys = [...dayKeys].sort((a, b) => a.localeCompare(b));

      const fromLabel = from.toLocaleDateString("fr-FR");
      const toLabel = to.toLocaleDateString("fr-FR");
      const periodLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;
      const generatedAtLabel = new Date().toLocaleString("fr-FR");

      const rows = sortedDayKeys.map((dayKey) => {
        const day = new Date(`${dayKey}T00:00:00`);
        const dateLabel = day.toLocaleDateString("fr-FR");
        const ptg = pointagesByDay.get(dayKey);
        const brk = breaksByDay.get(dayKey);
        const startTimes = (brk?.startTimes ?? []).slice().sort();
        const endTimes = (brk?.endTimes ?? []).slice().sort();

        let lateLabel = "";
        const entryMinutes = ptg?.entry ? parseTimeToMinutes(ptg.entry) : null;
        if (entryMinutes !== null) {
          const diff = entryMinutes - workStartMinutes;
          if (diff > 0) {
            lateLabel = formatMinutesHHMM(diff);
          }
        }

        const breakMinutes = brk?.minutes ?? 0;
        const workMinutes = ptg?.minutes ?? 0;

        return {
          dateLabel,
          position,
          checkIn: normalizeTime(ptg?.entry),
          lateLabel,
          checkOut: normalizeTime(ptg?.exit),
          breakStart: normalizeTime(startTimes[0] ?? ""),
          breakEnd: normalizeTime(endTimes.length > 0 ? endTimes[endTimes.length - 1] : ""),
          breakDuration: breakMinutes > 0 ? formatMinutesHuman(breakMinutes) : "",
          workDuration: workMinutes > 0 ? formatMinutesHuman(workMinutes) : "",
        };
      });

      const html = renderPointagesEmployeeReportHtml({
        periodLabel,
        generatedAtLabel,
        employeeLabel:
          `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim() || user?.username || "Employé",
        departmentLabel: user?.department ?? "—",
        positionLabel: user?.position ?? "—",
        rows,
      });

      const pdfBytes = await renderPdfFromHtml({ html });
      const pdfBody = Buffer.from(pdfBytes);
      const fileName = `rapport_pointages_employe_${new Date().toISOString().slice(0, 10)}.pdf`;

      return new NextResponse(pdfBody, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=\"${fileName}\"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const breaksByUser = new Map<string, { startTimes: string[]; endTimes: string[] }>();
    const breakMinutesByUser = new Map<string, number>();
    for (const b of breaks) {
      const startTime = b.startTime ?? "";
      const endTime = b.endTime ?? "";
      if (!startTime && !endTime) continue;

      const current = breaksByUser.get(b.userId) ?? { startTimes: [], endTimes: [] };
      if (startTime) current.startTimes.push(startTime);
      if (endTime) current.endTimes.push(endTime);
      breaksByUser.set(b.userId, current);

      if (typeof b.duration === "number") {
        breakMinutesByUser.set(b.userId, (breakMinutesByUser.get(b.userId) ?? 0) + b.duration);
      }
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
        checkIn: normalizeTime(times?.entry),
        checkOut: normalizeTime(times?.exit),
        breakStart: normalizeTime(startTimes[0] ?? ""),
        breakEnd: normalizeTime(endTimes.length > 0 ? endTimes[endTimes.length - 1] : ""),
        breakDuration: totalBreakMinutes > 0 ? formatMinutesHuman(totalBreakMinutes) : "",
        workDuration: totalWorkMinutes > 0 ? formatMinutesHuman(totalWorkMinutes) : "",
      };
    });

    const fromLabel = from.toLocaleDateString("fr-FR");
    const toLabel = to.toLocaleDateString("fr-FR");
    const periodLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;

    const generatedAtLabel = new Date().toLocaleString("fr-FR");

    const html = renderPointagesReportHtml({
      periodLabel,
      generatedAtLabel,
      rows,
    });

    const pdfBytes = await renderPdfFromHtml({ html });

    const pdfBody = Buffer.from(pdfBytes);

    const fileNameBase = isTeamReport ? "rapport_pointages_equipe" : "rapport_pointages_employe";
    const fileName = `${fileNameBase}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[reports/pointages] PDF generation failed", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 },
    );
  }
}
