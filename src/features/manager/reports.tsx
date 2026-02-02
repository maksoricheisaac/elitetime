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
    cell: ({ row }) => <span>{row.original.totalHours}h</span>,
  },
  {
    accessorKey: "totalBreakMinutes",
    header: () => <span>Heures de pause</span>,
    cell: ({ row }) => (
      <span>{Math.round(row.original.totalBreakMinutes / 60)}h</span>
    ),
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
          {value}h
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
      ...filteredStats.map((s) => [
        `${s.employee.firstname} ${s.employee.lastname}`,
        s.employee.department || "",
        s.totalHours.toString(),
        Math.round(s.totalBreakMinutes / 60).toString(),
        s.lateCount.toString(),
        s.absenceCount.toString(),
        s.overtimeHours.toString(),
      ]),
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

  const periodLabel = rangeLabel || "Période sélectionnée";
  const departmentLabel =
    filterDepartment === "all"
      ? "Tous les départements"
      : `Département : ${filterDepartment}`;
  const employeesLabel = `${filteredStats.length} employé(s)`;
  const summaryLabel = `Total heures : ${totalTeamHours}h  |  Moyenne : ${avgHours}h  |  Heures sup : ${totalOvertime}h`;

try {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  /* ==============================
     CONSTANTES GLOBALES
  ============================== */
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 40;
  const ROW_HEIGHT = 20;
  const FOOTER_HEIGHT = 40;

  const COLORS = {
    headerMain: rgb(0.11, 0.42, 0.76),
    headerSecondary: rgb(0.06, 0.32, 0.58),
    textDark: rgb(0.15, 0.15, 0.2),
    textLight: rgb(1, 1, 1),
    muted: rgb(0.4, 0.45, 0.6),
    tableHeaderBg: rgb(0.06, 0.32, 0.58),
    tableBorder: rgb(0.75, 0.75, 0.8),
    altRow: rgb(0.96, 0.98, 1),
    late: rgb(0.8, 0.2, 0.2),
    absence: rgb(0.85, 0.45, 0.2),
    overtime: rgb(0.1, 0.55, 0.32),
    footer: rgb(0.06, 0.32, 0.58),
  };

  let pageNumber = 0;
  const generatedAt = new Date().toLocaleString();

  /* ==============================
     HEADER COMMUN
  ============================== */
  const drawHeader = (page, title: string, subtitle?: string) => {
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 120,
      width: PAGE_WIDTH,
      height: 120,
      color: COLORS.headerMain,
    });

    page.drawRectangle({
      x: PAGE_WIDTH * 0.45,
      y: PAGE_HEIGHT - 120,
      width: PAGE_WIDTH * 0.55,
      height: 80,
      color: COLORS.headerSecondary,
    });

    page.drawText(title, {
      x: MARGIN,
      y: PAGE_HEIGHT - 70,
      size: 20,
      font: fontBold,
      color: COLORS.textLight,
    });

    if (subtitle) {
      page.drawText(subtitle, {
        x: MARGIN,
        y: PAGE_HEIGHT - 92,
        size: 11,
        font: fontRegular,
        color: rgb(0.9, 0.9, 1),
      });
    }
  };

  /* ==============================
     FOOTER COMMUN
  ============================== */
  const drawFooter = (page) => {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: 28,
      color: COLORS.footer,
    });

    page.drawText(`Généré le ${generatedAt}`, {
      x: MARGIN,
      y: 10,
      size: 9,
      font: fontRegular,
      color: COLORS.textLight,
    });

    const label = `Page ${pageNumber}`;
    const w = fontRegular.widthOfTextAtSize(label, 9);

    page.drawText(label, {
      x: PAGE_WIDTH - MARGIN - w,
      y: 10,
      size: 9,
      font: fontRegular,
      color: COLORS.textLight,
    });
  };

  /* ======================================================
     PAGES  TABLEAU D48TAILL48 PAR EMPLOY c9
  ====================================================== */

  const createEmployeePage = () => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber++;

    drawHeader(
      page,
      "Rapport équipe - Détail par employé",
      `Période : ${periodLabel} | ${departmentLabel}`,
    );
    drawFooter(page);

    const tableTop = PAGE_HEIGHT - 150;
    const tableWidth = PAGE_WIDTH - MARGIN * 2;

    const contextTop = tableTop + 20;

    page.drawText(employeesLabel, {
      x: MARGIN,
      y: contextTop,
      size: 9,
      font: fontRegular,
      color: COLORS.muted,
    });

    page.drawText(summaryLabel, {
      x: MARGIN,
      y: contextTop - 12,
      size: 9,
      font: fontRegular,
      color: COLORS.muted,
    });

    const columns = [
      { label: "Employé", width: tableWidth * 0.25 },
      { label: "Département", width: tableWidth * 0.18 },
      { label: "Heures", width: tableWidth * 0.1 },
      { label: "Pause", width: tableWidth * 0.1 },
      { label: "Retards", width: tableWidth * 0.1 },
      { label: "Absences", width: tableWidth * 0.12 },
      { label: "Heures sup", width: tableWidth * 0.15 },
    ];

    let x = MARGIN;

    page.drawRectangle({
      x: MARGIN,
      y: tableTop - ROW_HEIGHT,
      width: tableWidth,
      height: ROW_HEIGHT,
      color: COLORS.tableHeaderBg,
    });

    columns.forEach((c) => {
      page.drawText(c.label, {
        x: x + 6,
        y: tableTop - 14,
        size: 10,
        font: fontBold,
        color: COLORS.textLight,
      });
      x += c.width;
    });

    return {
      page,
      y: tableTop - ROW_HEIGHT,
      columns,
    };
  };

  let { page, y, columns } = createEmployeePage();

  filteredStats.forEach((s, index) => {
    if (y < FOOTER_HEIGHT + ROW_HEIGHT) {
      ({ page, y, columns } = createEmployeePage());
    }

    let x = MARGIN;

    if (index % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - ROW_HEIGHT,
        width: PAGE_WIDTH - MARGIN * 2,
        height: ROW_HEIGHT,
        color: COLORS.altRow,
      });
    }

    const values = [
      `${s.employee.firstname} ${s.employee.lastname}`,
      s.employee.department || "-",
      `${s.totalHours}h`,
      `${Math.round(s.totalBreakMinutes / 60)}h`,
      String(s.lateCount),
      String(s.absenceCount),
      `${s.overtimeHours}h`,
    ];

    values.forEach((v, i) => {
      page.drawText(v, {
        x: x + 6,
        y: y - 14,
        size: 10,
        font: fontRegular,
        color:
          i === 4 && s.lateCount > 0
            ? COLORS.late
            : i === 5 && s.absenceCount > 0
            ? COLORS.absence
            : i === 6 && s.overtimeHours > 0
            ? COLORS.overtime
            : COLORS.textDark,
      });
      x += columns[i].width;
    });

    y -= ROW_HEIGHT;
  });

  /* ==============================
     EXPORT
  ============================== */
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "feuille-temps-elitetime.pdf";
  a.click();

  URL.revokeObjectURL(url);
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
