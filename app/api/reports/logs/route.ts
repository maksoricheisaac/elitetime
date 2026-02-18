import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, getUserPermissions } from "@/lib/security/rbac";
import { renderPdfFromHtml } from "@/lib/reports/html-to-pdf";
import { renderLogsReportHtml } from "@/lib/reports/logs-report-template";

export const dynamic = "force-dynamic";

function toDayBounds(date: Date): { from: Date; to: Date } {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLimitParam(value: string | null): number {
  const n = value ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return 2000;
  return Math.min(n, 10000);
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser();
    const permissions = await getUserPermissions(auth.user.id);
    const permissionSet = new Set(permissions.map((p) => p.name));

    const isAdminOrManager = ["admin", "manager"].includes(auth.user.role);
    const canViewLogs = permissionSet.has("view_logs") || isAdminOrManager;

    if (!canViewLogs) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const url = new URL(req.url);
    const fromParam = parseDateParam(url.searchParams.get("from"));
    const toParam = parseDateParam(url.searchParams.get("to"));
    const limit = parseLimitParam(url.searchParams.get("limit"));

    const today = new Date();
    const defaultBounds = toDayBounds(today);

    const from = fromParam ? toDayBounds(fromParam).from : defaultBounds.from;
    const to = toParam ? toDayBounds(toParam).to : defaultBounds.to;

    const logs = await prisma.activityLog.findMany({
      where: {
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      include: {
        user: true,
      },
    });

    const rows = logs.map((log) => {
      const user = log.user;
      const userLabel =
        user
          ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || user.email || user.username
          : "Utilisateur supprimé";

      return {
        userLabel,
        typeLabel: log.type,
        action: log.action,
        details: log.details,
        timestampLabel: new Date(log.timestamp).toLocaleString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
    });

    const fromLabel = from.toLocaleDateString("fr-FR");
    const toLabel = to.toLocaleDateString("fr-FR");
    const periodLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;

    const html = renderLogsReportHtml({
      periodLabel,
      generatedAtLabel: new Date().toLocaleString("fr-FR"),
      rows,
    });

    const pdfBytes = await renderPdfFromHtml({ html });
    const pdfBody = Buffer.from(pdfBytes);

    const fileName = `rapport_logs_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[reports/logs] PDF generation failed", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 },
    );
  }
}
