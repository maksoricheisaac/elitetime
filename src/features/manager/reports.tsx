"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/contexts/notification-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, Eye } from "lucide-react";
import { EmployeeReportDateRangeFilter } from "@/features/manager/employee-report-date-range-filter";
import type { User, Pointage, Break as BreakModel } from "@/generated/prisma/client";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { formatMinutesHuman } from "@/lib/time-format";

interface ManagerReportsClientProps {
  team: User[];
  pointages: Pointage[];
  breaks: BreakModel[];
  overtimeThreshold: number;
}

interface EmployeeStats {
  employee: User;
  totalHours: number;
  lateCount: number;
  absenceCount: number;
  overtimeHours: number;
  totalBreakMinutes: number;
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

const employeeStatsColumns: ColumnDef<EmployeeStats>[] = [
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
    accessorKey: "totalHours",
    header: () => <span>Heures travaillées</span>,
    cell: ({ row }) => {
      const minutes = row.original.totalHours * 60;
      return <span>{formatMinutesHuman(minutes)}</span>;
    },
  },
  {
    accessorKey: "totalBreakMinutes",
    header: () => <span>Heures de pause</span>,
    cell: ({ row }) => {
      const minutes = row.original.totalBreakMinutes;
      if (!minutes || minutes <= 0) return <span>-</span>;
      return <span>{formatMinutesHuman(minutes)}</span>;
    },
  },
  {
    accessorKey: "lateCount",
    header: () => <span>Retards</span>,
    cell: ({ row }) => {
      const value = row.original.lateCount;
      return (
        <span className={value > 0 ? "text-destructive font-semibold" : ""}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "absenceCount",
    header: () => <span>Absences</span>,
    cell: ({ row }) => {
      const value = row.original.absenceCount;
      return (
        <span className={value > 0 ? "text-warning font-semibold" : ""}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "overtimeHours",
    header: () => <span>Heures sup</span>,
    cell: ({ row }) => {
      const value = row.original.overtimeHours;
      return (
        <span className={value > 0 ? "text-success font-semibold" : ""}>
          {formatMinutesHuman(value * 60)}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="block text-right">Actions</span>,
    cell: ({ row }) => {
      const employee = row.original.employee;
      return (
        <div className="flex justify-end">
          <Button className="cursor-pointer" asChild variant="outline" size="sm">
            <Link href={`/reports/${employee.id}`} className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>Voir plus</span>
            </Link>
          </Button>
        </div>
      );
    },
  },
];

export default function ManagerReportsClient({ team, pointages, breaks, overtimeThreshold }: ManagerReportsClientProps) {
  const { showSuccess, showError, showInfo } = useNotification();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const searchParams = useSearchParams();

  const toDateParam = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const { from, to, rangeLabel } = useMemo(() => {
    const fromParam = searchParams?.get("from") ?? undefined;
    const toParam = searchParams?.get("to") ?? undefined;

    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 30);
    defaultFrom.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
    const toDate = toParam ? new Date(toParam) : today;

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

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

    return { from: fromDate, to: toDate, rangeLabel: label };
  }, [searchParams]);

  const periodFilteredPointages = useMemo(() => {
    return pointages.filter((p) => {
      const d = new Date(p.date as unknown as string);
      return d >= from && d <= to;
    });
  }, [pointages, from, to]);

  const periodFilteredBreaks = useMemo(() => {
    return breaks.filter((b) => {
      const d = new Date(b.date as unknown as string);
      return d >= from && d <= to;
    });
  }, [breaks, from, to]);

  const stats: EmployeeStats[] = useMemo(() => {
    const businessDays = countBusinessDays(from, to);
    const threshold = overtimeThreshold || 40;

    return team.map((employee) => {
      const employeePointages = periodFilteredPointages.filter(
        (p) => p.userId === employee.id
      );

      const employeeBreaks = periodFilteredBreaks.filter(
        (b) => b.userId === employee.id
      );

      const totalMinutes = employeePointages.reduce(
        (sum, p) => sum + p.duration,
        0
      );
      const totalHours = Math.floor(totalMinutes / 60);
      const totalBreakMinutes = employeeBreaks.reduce(
        (sum, b) => sum + (b.duration || 0),
        0
      );
      const lateCount = employeePointages.filter((p) => p.status === "late").length;

      const workedDays = new Set(
        employeePointages.map((p) => {
          const d = new Date(p.date as unknown as string);
          return d.toDateString();
        })
      ).size;
      const absenceCount = Math.max(0, businessDays - workedDays);

      const overtimeHours = Math.max(0, totalHours - threshold);

      return {
        employee,
        totalHours,
        lateCount,
        absenceCount,
        overtimeHours,
        totalBreakMinutes,
      };
    });
  }, [team, periodFilteredPointages, periodFilteredBreaks, from, to, overtimeThreshold]);

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

  const filteredStats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return stats.filter(({ employee }) => {
      const matchesSearch = term
        ? `${employee.firstname} ${employee.lastname}`
            .toLowerCase()
            .includes(term)
        : true;

      const matchesDepartment =
        filterDepartment === "all" || employee.department === filterDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [stats, searchTerm, filterDepartment]);

  const totalTeamHours = filteredStats.reduce((sum, s) => sum + s.totalHours, 0);
  const avgHours = filteredStats.length > 0 ? Math.round(totalTeamHours / filteredStats.length) : 0;
  const totalOvertime = filteredStats.reduce((sum, s) => sum + s.overtimeHours, 0);

  const handleExport = () => {
    // Export CSV simple en mémoire (peut être amélioré plus tard)
    const rows = [
      [
        "Employé",
        "Département",
        "Heures travaillées",
        "Heures de pause",
        "Retards",
        "Absences",
        "Heures sup",
      ],
      ...filteredStats.map((s) => {
        const totalMinutes = s.totalHours * 60;
        const overtimeMinutes = s.overtimeHours * 60;
        const breakMinutes = s.totalBreakMinutes;

        return [
          `${s.employee.firstname} ${s.employee.lastname}`,
          s.employee.department || "",
          formatMinutesHuman(totalMinutes),
          breakMinutes > 0 ? formatMinutesHuman(breakMinutes) : "0 min",
          s.lateCount.toString(),
          s.absenceCount.toString(),
          formatMinutesHuman(overtimeMinutes),
        ];
      }),
    ];

    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rapport-equipe.csv";
    a.click();
    URL.revokeObjectURL(url);

    showSuccess("Rapport exporté avec succès");
  };

  const handleExportPdf = async () => {
    if (filteredStats.length === 0) {
      showInfo("Aucune donnée à exporter pour cette sélection.");
      return;
    }

    setIsExportingPdf(true);

    try {
      const fromParam = toDateParam(from);
      const toParam = toDateParam(to);
      const url = `/api/reports/pointages?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `rapport_pointages_${fromParam}_${toParam}.pdf`;
      a.click();
      URL.revokeObjectURL(objectUrl);

      showSuccess("Rapport PDF téléchargé avec succès");
    } catch (error) {
      console.error(error);
      showError("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapports</h1>
          <p className="text-muted-foreground">
            Analyse des performances de l&apos;équipe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="cursor-pointer" variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button className="cursor-pointer" onClick={handleExportPdf} disabled={isExportingPdf}>
            <Download className="mr-2 h-4 w-4" />
            {isExportingPdf ? "Génération..." : "Télécharger le PDF"}
          </Button>
        </div>
      </div>
    
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-full max-w-xs">
          <EmployeeReportDateRangeFilter />
        </div>
    
        <Input
          placeholder="Rechercher un employé..."
          className="w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
    
        {departments.length > 1 && (
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
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
        )}
      </div>
    
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heures totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeamHours}h</div>
            <p className="text-xs text-muted-foreground">Pour toute l&apos;équipe</p>
          </CardContent>
        </Card>
    
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne par employé</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHours}h</div>
            <p className="text-xs text-muted-foreground">Par employé sur la période</p>
          </CardContent>
        </Card>
    
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heures sup totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOvertime}h</div>
            <p className="text-xs text-muted-foreground">Pour toute l&apos;équipe</p>
          </CardContent>
        </Card>
      </div>
    
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif par employé</CardTitle>
          <CardDescription>
            {rangeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={employeeStatsColumns} data={filteredStats} />
        </CardContent>
      </Card>
    </div>
  );
}
