"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import type { User, Pointage, Absence, Break } from "@/generated/prisma/client";
import { Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { PresenceChart } from "@/components/charts/presence-chart";
import { formatMinutesHuman } from "@/lib/time-format";
import { useNotification } from "@/contexts/notification-context";
import { EmployeeReportDateRangeFilter } from "@/features/manager/employee-report-date-range-filter";

interface ManagerPointagesClientProps {
  team: User[];
  pointages: Pointage[];
  absences: Absence[];
  breaks: Break[];
}

type TodayRow = {
  employee: User;
  pointage: Pointage | null;
  breaks: Break[];
};

type TableRow = TodayRow | AverageRow;

type AverageRow = {
  employee: User;
  avgEntryTime: string;
  avgExitTime: string;
  avgBreakStart: string;
  avgBreakEnd: string;
  avgBreakDurationMinutes: number;
  avgWorkDurationMinutes: number;
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

function formatMinutesToTime(value: number | null): string {
  if (value == null) return "-";
  const rounded = Math.round(value);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function logReportExport(reportType: string, details?: string) {
  try {
    await fetch("/api/activity/report-export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reportType, details }),
    });
  } catch {
    // best-effort logging, ne pas casser l'UX
  }
}

export default function ManagerPointagesClient({ team, pointages, absences, breaks }: ManagerPointagesClientProps) {
  const { showSuccess, showError, showInfo } = useNotification();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const searchParams = useSearchParams();

  const { from, to, days, rangeLabel, isSingleDay } = useMemo(() => {
    const fromParam = searchParams?.get("from") ?? undefined;
    const toParam = searchParams?.get("to") ?? undefined;

    const parseLocal = (value: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(`${value}T00:00:00`);
      }
      return new Date(value);
    };

    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 30);
    defaultFrom.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    const fromDate = fromParam ? parseLocal(fromParam) : defaultFrom;
    const toDate = toParam ? parseLocal(toParam) : today;

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const diffMs = toDate.getTime() - fromDate.getTime();
    const computedDays = diffMs >= 0 ? Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1 : 1;

    const fromLabel = fromDate.toLocaleDateString("fr-FR");
    const toLabel = toDate.toLocaleDateString("fr-FR");

    let label = "Choisir une période";
    if (fromLabel && !toLabel) {
      label = fromLabel;
    } else if (!fromLabel && toLabel) {
      label = toLabel;
    } else if (fromLabel && toLabel && fromLabel === toLabel) {
      label = fromLabel;
    } else if (fromLabel && toLabel) {
      label = `${fromLabel} – ${toLabel}`;
    }

    return {
      from: fromDate,
      to: toDate,
      days: Math.max(1, computedDays),
      rangeLabel: label,
      isSingleDay: isSameDay(fromDate, toDate),
    };
  }, [searchParams]);

  const selectedPointages = useMemo(
    () =>
      pointages.filter((p) => {
        const d = new Date(p.date as unknown as string);
        return d >= from && d <= to;
      }),
    [pointages, from, to]
  );

  // On considère un employé "présent" s'il a au moins un pointage pour la journée,
  // ce qui aligne la synthèse et les filtres avec la logique des graphiques.
  const presentTodayIds = useMemo(
    () => new Set(selectedPointages.map((p) => p.userId)),
    [selectedPointages]
  );

  const selectedBreaks = useMemo(
    () =>
      breaks.filter((b) => {
        const d = new Date(b.date as unknown as string);
        return d >= from && d <= to;
      }),
    [breaks, from, to]
  );

  const onLeaveTodayIds = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const ids = new Set<string>();
    for (const a of absences) {
      if (a.status !== "approved" || a.type !== "conge") continue;
      const start = new Date(a.startDate as unknown as string);
      const end = new Date(a.endDate as unknown as string);
      if (start <= todayEnd && end >= todayStart) {
        ids.add(a.userId);
      }
    }
    return ids;
  }, [absences]);

  const presenceData = useMemo(() => {
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date(from);
      date.setDate(from.getDate() + i);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const employeeIdsWithPointage = new Set(
        pointages
          .filter((p) => {
            const d = new Date(p.date as unknown as string);
            return d >= dayStart && d <= dayEnd;
          })
          .map((p) => p.userId)
      );

      const presents = employeeIdsWithPointage.size;
      const total = team.length;
      const absents = Math.max(0, total - presents);

      return {
        date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        presents,
        absents,
        total,
      };
    });

    return data;
  }, [days, from, pointages, team]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          team
            .map((e) => e.department)
            .filter((d): d is string => Boolean(d))
        )
      ),
    [team]
  );

  const filteredTeam = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return team.filter((employee) => {
      const isPresent = presentTodayIds.has(employee.id);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "present" && isPresent) ||
        (statusFilter === "absent" && !isPresent);

      const matchesSearch = term
        ? `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(term)
        : true;

      const matchesDepartment =
        departmentFilter === "all" || employee.department === departmentFilter;

      return matchesStatus && matchesSearch && matchesDepartment;
    });
  }, [team, presentTodayIds, searchTerm, statusFilter, departmentFilter]);

  const tableRows = useMemo(() => {
    if (isSingleDay) {
      return filteredTeam.map((employee) => {
        const employeePointages = selectedPointages
          .filter((p) => p.userId === employee.id)
          .sort(
            (a, b) =>
              new Date(b.date as unknown as string).getTime() -
              new Date(a.date as unknown as string).getTime(),
          );

        const lastPointage = employeePointages[0] ?? null;
        const employeeBreaks = selectedBreaks.filter((b) => b.userId === employee.id);
        return { employee, pointage: lastPointage, breaks: employeeBreaks } satisfies TodayRow;
      });
    }

    return filteredTeam.map((employee) => {
      const employeePointages = selectedPointages.filter((p) => p.userId === employee.id);
      const employeeBreaks = selectedBreaks.filter((b) => b.userId === employee.id);

      const entryMinutes = employeePointages
        .map((p) => parseTimeToMinutes(p.entryTime))
        .filter((v): v is number => v != null);
      const exitMinutes = employeePointages
        .map((p) => parseTimeToMinutes(p.exitTime))
        .filter((v): v is number => v != null);

      const avgEntry = entryMinutes.length > 0 ? entryMinutes.reduce((a, b) => a + b, 0) / entryMinutes.length : null;
      const avgExit = exitMinutes.length > 0 ? exitMinutes.reduce((a, b) => a + b, 0) / exitMinutes.length : null;

      const breakStartMinutes = employeeBreaks
        .map((b) => parseTimeToMinutes(b.startTime))
        .filter((v): v is number => v != null);
      const breakEndMinutes = employeeBreaks
        .map((b) => parseTimeToMinutes(b.endTime))
        .filter((v): v is number => v != null);

      const avgBreakStart =
        breakStartMinutes.length > 0
          ? breakStartMinutes.reduce((a, b) => a + b, 0) / breakStartMinutes.length
          : null;
      const avgBreakEnd =
        breakEndMinutes.length > 0
          ? breakEndMinutes.reduce((a, b) => a + b, 0) / breakEndMinutes.length
          : null;

      const breakDurationMinutes = employeeBreaks
        .map((b) => b.duration ?? 0)
        .filter((v) => v > 0);
      const workDurationMinutes = employeePointages
        .map((p) => p.duration ?? 0)
        .filter((v) => v > 0);

      const avgBreakDurationMinutes =
        breakDurationMinutes.length > 0
          ? breakDurationMinutes.reduce((a, b) => a + b, 0) / breakDurationMinutes.length
          : 0;

      const avgWorkDurationMinutes =
        workDurationMinutes.length > 0
          ? workDurationMinutes.reduce((a, b) => a + b, 0) / workDurationMinutes.length
          : 0;

      return {
        employee,
        avgEntryTime: formatMinutesToTime(avgEntry),
        avgExitTime: formatMinutesToTime(avgExit),
        avgBreakStart: formatMinutesToTime(avgBreakStart),
        avgBreakEnd: formatMinutesToTime(avgBreakEnd),
        avgBreakDurationMinutes,
        avgWorkDurationMinutes,
      } satisfies AverageRow;
    });
  }, [filteredTeam, isSingleDay, selectedBreaks, selectedPointages]);

  const totalEmployees = team.length;
  const presentCount = presentTodayIds.size;
  const onLeaveCount = onLeaveTodayIds.size;
  const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

  const handleExportPdf = async () => {
    if (tableRows.length === 0) {
      showInfo("Aucun pointage à exporter pour cette période.");
      return;
    }

    try {
      setIsExportingPdf(true);

      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      void logReportExport("TEAM_DAILY_POINTAGES_PDF", `Période: ${rangeLabel}`);
      const res = await fetch(
        `/api/reports/pointages?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
      );
      if (!res.ok) {
        throw new Error(`PDF download failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `pointages_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess("PDF généré avec succès.");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF", error);
      showError("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const columns = useMemo(() => {
    const base: ColumnDef<TableRow>[] = [
    {
      accessorKey: "employee",
      header: () => <span>Employé</span>,
      cell: ({ row }) => {
        const employee = row.original.employee;
        return (
          <span className="font-medium">
            {employee.firstname} {employee.lastname}
          </span>
        );
      },
    },
    {
      accessorKey: "department",
      header: () => <span>Département</span>,
      cell: ({ row }) => <span>{row.original.employee.department}</span>,
    },
    {
      accessorKey: "entryTime",
      header: () => <span>Entrée</span>,
      cell: ({ row }) =>
        isSingleDay ? (
          <span>{(row.original as TodayRow).pointage?.entryTime || "-"}</span>
        ) : (
          <span>{(row.original as AverageRow).avgEntryTime}</span>
        ),
    },
    {
      accessorKey: "exitTime",
      header: () => <span>Sortie</span>,
      cell: ({ row }) =>
        isSingleDay ? (
          <span>{(row.original as TodayRow).pointage?.exitTime || "-"}</span>
        ) : (
          <span>{(row.original as AverageRow).avgExitTime}</span>
        ),
    },
    ];

    if (isSingleDay) {
      base.push({
        accessorKey: "lateReason",
        header: () => <span>Motif</span>,
        cell: ({ row }) => {
          const reason = (row.original as TodayRow).pointage?.lateReason;
          if (!reason) return <span>-</span>;
          const truncated = reason.length > 80 ? `${reason.slice(0, 77)}…` : reason;
          return <span className="text-xs text-muted-foreground">{truncated}</span>;
        },
      });
    }

    base.push(
    {
      id: "breakStart",
      header: () => <span>Début pause</span>,
      cell: ({ row }) => {
        if (!isSingleDay) return <span>{(row.original as AverageRow).avgBreakStart}</span>;

        const employeeBreaks = (row.original as TodayRow).breaks;
        if (!employeeBreaks || employeeBreaks.length === 0) {
          return <span>-</span>;
        }
        const startTimes = employeeBreaks
          .map((b) => b.startTime)
          .filter((t): t is string => Boolean(t))
          .sort();
        const first = startTimes[0];
        return <span>{first || "-"}</span>;
      },
    },
    {
      id: "breakEnd",
      header: () => <span>Fin pause</span>,
      cell: ({ row }) => {
        if (!isSingleDay) return <span>{(row.original as AverageRow).avgBreakEnd}</span>;

        const employeeBreaks = (row.original as TodayRow).breaks;
        if (!employeeBreaks || employeeBreaks.length === 0) {
          return <span>-</span>;
        }
        const endTimes = employeeBreaks
          .map((b) => b.endTime)
          .filter((t): t is string => Boolean(t))
          .sort();
        const last = endTimes[endTimes.length - 1];
        return <span>{last || "-"}</span>;
      },
    },
    {
      id: "breakDuration",
      header: () => <span>Durée pauses</span>,
      cell: ({ row }) => {
        if (!isSingleDay) {
          const value = (row.original as AverageRow).avgBreakDurationMinutes;
          if (!value || value <= 0) return <span>-</span>;
          return <span>{formatMinutesHuman(value)}</span>;
        }

        const employeeBreaks = (row.original as TodayRow).breaks;
        if (!employeeBreaks || employeeBreaks.length === 0) {
          return <span>-</span>;
        }
        const totalMinutes = employeeBreaks.reduce(
          (sum, b) => sum + (b.duration ?? 0),
          0,
        );
        if (totalMinutes <= 0) {
          return <span>-</span>;
        }
        return <span>{formatMinutesHuman(totalMinutes)}</span>;
      },
    },
    {
      accessorKey: "duration",
      header: () => <span>Durée</span>,
      cell: ({ row }) => {
        if (!isSingleDay) {
          const value = (row.original as AverageRow).avgWorkDurationMinutes;
          if (!value || value <= 0) return <span>-</span>;
          return <span>{formatMinutesHuman(value)}</span>;
        }

        const pointage = (row.original as TodayRow).pointage;
        if (!pointage || !pointage.duration || pointage.duration <= 0) {
          return <span>-</span>;
        }
        const hours = Math.floor(pointage.duration / 60);
        const minutes = pointage.duration % 60;
        return (
          <span>
            {hours}h {minutes}m
          </span>
        );
      },
    },
    {
      id: "status",
      header: () => <span>Statut</span>,
      cell: ({ row }) => {
        const pointage = isSingleDay ? (row.original as TodayRow).pointage : null;
        const employee = row.original.employee;
        const isOnLeave = onLeaveTodayIds.has(employee.id);

        // Cas sans pointage
        if (!pointage && isOnLeave) {
          return (
            <Badge
              variant="outline"
              className="border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-900/40 dark:text-sky-200"
            >
              En congé
            </Badge>
          );
        }

        if (!pointage) {
          return (
            <Badge
              variant="outline"
              className="border-muted bg-muted/40 text-muted-foreground dark:border-slate-700 dark:bg-slate-900/40"
            >
              Non pointé
            </Badge>
          );
        }

        // Cas avec pointage
        if (pointage.isActive) {
          return (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-200"
            >
              En activité
            </Badge>
          );
        }

        if (pointage.status === "late") {
          return (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/40 dark:text-amber-200"
            >
              En retard
            </Badge>
          );
        }

        if (pointage.status === "incomplete") {
          return (
            <Badge
              variant="outline"
              className="border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-900/40 dark:text-sky-200"
            >
              Incomplet
            </Badge>
          );
        }

        // Cas par défaut : pointage terminé et normal
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-200"
          >
            Terminé
          </Badge>
        );
      },
    },
    );

    return base;
  }, [isSingleDay, onLeaveTodayIds]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Pointages
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Pointages de mon équipe</h1>
            <p className="text-sm text-muted-foreground">
              Consultez les pointages, la présence et les absences de votre équipe en détail
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full">
              <EmployeeReportDateRangeFilter />
            </div>
            <Button asChild variant="outline" className="mt-1 md:mt-0 cursor-pointer">
              <Link href="/pointages/manual">
                Saisie manuelle
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4 items-stretch">
        {/* Colonne gauche – Synthèse (1/4) */}
        <Card className="lg:col-span-1 h-full">
          <CardHeader>
            <CardTitle>Synthèse de la présence aujourd&apos;hui</CardTitle>
            <CardDescription>
              Vue d&apos;ensemble des présences et absences sur l&apos;équipe pour la journée
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Effectif total</span>
              <span className="font-semibold">{totalEmployees}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Présents</span>
              <span className="font-semibold text-success">{presentCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">En congé</span>
              <span className="font-semibold">{onLeaveCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Absents</span>
              <span className="font-semibold">{absentCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Colonne droite – Graphique (3/4) */}
        <div className="lg:col-span-3 h-full space-y-3 flex flex-col">
          <PresenceChart
            data={presenceData}
            title={`Présence de l'équipe sur les ${rangeLabel}`}
            description={`Nombre de collaborateurs présents et absents sur les ${rangeLabel.toLowerCase()}`}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isSingleDay ? "Pointages du jour" : "Moyennes sur la période"}</CardTitle>
          <CardDescription>
            {isSingleDay
              ? "Liste des pointages du jour pour tous les employés de l'équipe"
              : "Synthèse moyenne des pointages sur la période sélectionnée"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Rechercher un employé</Label>
              <Input
                placeholder="Nom, prénom"
                className="w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Rechercher par statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="present">Présents</SelectItem>
                <SelectItem value="absent">Absents</SelectItem>
              </SelectContent>
            </Select>
            </div>

            {departments.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Rechercher par département</Label>
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrer par département" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="cursor-pointer"
              onClick={handleExportPdf}
              disabled={tableRows.length === 0 || isExportingPdf}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              <span>{isExportingPdf ? "Génération..." : "Exporter en PDF"}</span>
            </Button>
          </div>
          <DataTable columns={columns} data={tableRows} />
        </CardContent>
      </Card>
    </div>
  );
}
