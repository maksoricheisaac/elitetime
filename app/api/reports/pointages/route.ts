import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, getUserPermissions } from "@/lib/security/rbac";
import { renderPointagesReportHtml } from "@/lib/reports/pointages-report-template";
import { renderPdfFromHtml } from "@/lib/reports/html-to-pdf";

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
        status: "active",
      };

      users = await prisma.user.findMany({
        where: whereUser,
      });
    } else {
      // Team/global report.
      if (!canViewTeam && !canViewAll) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      const whereUser: NonNullable<
        NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"]
      > = {
        status: "active",
        role: { in: ["employee", "team_lead"] },
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
    for (const p of pointages) {
      const current = pointagesByUser.get(p.userId) ?? { entry: "", exit: "" };
      if (p.entryTime) current.entry = p.entryTime;
      if (p.exitTime) current.exit = p.exitTime;
      pointagesByUser.set(p.userId, current);
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

      const startTimes = (userBreaks?.startTimes ?? []).slice().sort();
      const endTimes = (userBreaks?.endTimes ?? []).slice().sort();

      return {
        fullName,
        position,
        checkIn: times?.entry ?? "",
        checkOut: times?.exit ?? "",
        breakStart: startTimes[0] ?? "",
        breakEnd: endTimes.length > 0 ? endTimes[endTimes.length - 1] : "",
      };
    });

    const fromLabel = from.toLocaleDateString("fr-FR");
    const toLabel = to.toLocaleDateString("fr-FR");
    const periodLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;

    const html = renderPointagesReportHtml({
      periodLabel,
      generatedAtLabel: new Date().toLocaleString("fr-FR"),
      rows,
    });

    const pdfBytes = await renderPdfFromHtml({ html });

    const fileNameBase = isTeamReport ? "rapport_pointages_equipe" : "rapport_pointages_employe";
    const fileName = `${fileNameBase}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBytes, {
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
