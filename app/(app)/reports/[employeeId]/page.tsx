import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireNavigationAccessById } from "@/lib/navigation-guard";
import { formatMinutesHuman } from "@/lib/time-format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { EmployeePointagesDetailTable, type EmployeePointageDetailRow } from "@/features/manager/employee-pointages-detail-table";
import { EmployeeReportDateRangeFilter } from "@/features/manager/employee-report-date-range-filter";
import { EmployeeReportExports } from "@/features/manager/employee-report-exports";

interface EmployeeReportDetailPageProps {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<{ from?: string; to?: string }>;
}

function countBusinessDays(start: Date, end: Date) {
  const d = new Date(start);
  let count = 0;
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export default async function EmployeeReportDetailPage({ params, searchParams }: EmployeeReportDetailPageProps) {
  const { employeeId } = await params;
  const sp = (await searchParams) ?? {};

  const auth = await requireNavigationAccessById("reports");

  if (!["manager", "admin"].includes(auth.user.role)) {
    redirect("/dashboard");
  }

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });

  if (!employee || employee.role !== "employee") {
    redirect("/reports");
  }

  // Détermination de la plage de dates
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const defaultFrom = new Date();
  defaultFrom.setDate(today.getDate() - 30);
  defaultFrom.setHours(0, 0, 0, 0);

  const fromParam = sp.from;
  const toParam = sp.to;

  const parsedFrom = fromParam ? new Date(fromParam) : defaultFrom;
  const parsedTo = toParam ? new Date(toParam) : today;

  const from = Number.isNaN(parsedFrom.getTime()) ? defaultFrom : parsedFrom;
  const to = Number.isNaN(parsedTo.getTime()) ? today : parsedTo;

  // Charger les paramètres système pour le seuil d'heures sup
  const settings = await prisma.systemSettings.findFirst();
  const overtimeThreshold = settings?.overtimeThreshold ?? 40;

  const pointages = await prisma.pointage.findMany({
    where: {
      userId: employee.id,
      date: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { date: "desc" },
  });

  const breaks = await prisma.break.findMany({
    where: {
      userId: employee.id,
      date: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { date: "desc" },
  });

  const breaksByDay = new Map<string, number>();
  for (const b of breaks) {
    const d = new Date(b.date as unknown as string);
    const key = d.toISOString().split("T")[0];
    const current = breaksByDay.get(key) ?? 0;
    breaksByDay.set(key, current + (b.duration ?? 0));
  }

  // Heure de début de travail pour calculer les retards
  const workStartTime = settings?.workStartTime ?? "08:45";
  const [startHour, startMinute] = workStartTime.split(":").map(Number);

  const rows: EmployeePointageDetailRow[] = pointages.map((p) => {
    const d = new Date(p.date as unknown as string);
    const key = d.toISOString().split("T")[0];
    const pauseMinutes = breaksByDay.get(key) ?? 0;

    let lateMinutes = 0;
    if (p.entryTime) {
      const [eh, em] = p.entryTime.split(":").map(Number);
      if (!Number.isNaN(eh) && !Number.isNaN(em) && !Number.isNaN(startHour) && !Number.isNaN(startMinute)) {
        const diff = (eh * 60 + em) - (startHour * 60 + startMinute);
        if (diff > 0) {
          lateMinutes = diff;
        }
      }
    }

    return {
      id: p.id,
      date: d.toISOString(),
      entryTime: p.entryTime,
      exitTime: p.exitTime,
      duration: p.duration,
      status: p.status,
      pauseMinutes,
      lateMinutes,
    };
  });

  const totalMinutes = pointages.reduce((sum, p) => sum + p.duration, 0);
  const totalHours = Math.floor(totalMinutes / 60);

  const lateCount = pointages.filter((p) => p.status === "late").length;

  const businessDays = countBusinessDays(from, to);
  const workedDays = new Set(
    pointages.map((p) => {
      const d = new Date(p.date as unknown as string);
      return d.toDateString();
    }),
  ).size;
  const absenceCount = Math.max(0, businessDays - workedDays);

  const overtimeHours = Math.max(0, totalHours - overtimeThreshold);

  const rangeLabel = `${from.toLocaleDateString("fr-FR")} – ${to.toLocaleDateString("fr-FR")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <FileText className="h-3 w-3" />
            Rapport détaillé
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.firstname} {employee.lastname}
          </h1>
          <p className="text-sm text-muted-foreground">
            Synthèse des heures travaillées, pauses et retards sur la période sélectionnée.
          </p>
        </div>
        <Button type="button" variant="outline" asChild className="cursor-pointer">
          <Link href="/reports" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Retour aux rapports</span>
          </Link>
        </Button>
      </div>

      <Card className="border border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Résumé de la période</CardTitle>
              <CardDescription>
                Période analysée : {rangeLabel}
              </CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:items-end">
              <EmployeeReportDateRangeFilter />
              <EmployeeReportExports
                employee={{
                  firstname: employee.firstname as string,
                  lastname: employee.lastname as string,
                  department: employee.department,
                }}
                from={from.toISOString()}
                to={to.toISOString()}
                rows={rows}
                totalHours={totalHours}
                lateCount={lateCount}
                absenceCount={absenceCount}
                overtimeHours={overtimeHours}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1 rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">Heures travaillées</p>
              <p className="text-2xl font-bold">{formatMinutesHuman(totalHours * 60)}</p>
            </div>
            <div className="space-y-1 rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">Retards</p>
              <p className="text-2xl font-bold text-destructive">{lateCount}</p>
            </div>
            <div className="space-y-1 rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">Absences estimées</p>
              <p className="text-2xl font-bold text-warning">{absenceCount}</p>
            </div>
            <div className="space-y-1 rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">Heures sup</p>
              <p className="text-2xl font-bold text-success">{formatMinutesHuman(overtimeHours * 60)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Détail des pointages</CardTitle>
          <CardDescription>
            Vue détaillée des heures d&apos;entrée, de sortie, des durées et des pauses associées sur la période sélectionnée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun pointage trouvé pour cette période.
            </p>
          ) : (
            <EmployeePointagesDetailTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
