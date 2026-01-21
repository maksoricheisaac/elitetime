"use client";

import { useMemo, useState } from "react";
import { useNotification } from "@/contexts/notification-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, Users } from "lucide-react";
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

type Period = "day" | "week" | "month" | "quarter";

function getPeriodStart(period: Period, now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "day") {
    // aujourd'hui
  } else if (period === "week") {
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
  } else if (period === "month") {
    start.setDate(1);
  } else {
    const currentMonth = start.getMonth();
    const quarterStartMonth = currentMonth - (currentMonth % 3);
    start.setMonth(quarterStartMonth, 1);
  }

  return start;
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
];

export default function ManagerReportsClient({ team, pointages, breaks, overtimeThreshold }: ManagerReportsClientProps) {
  const { showSuccess, showError, showInfo } = useNotification();
  const [period, setPeriod] = useState<Period>("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const now = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const periodStart = useMemo(() => getPeriodStart(period, now), [period, now]);

  const periodFilteredPointages = useMemo(() => {
    return pointages.filter((p) => {
      const d = new Date(p.date as unknown as string);
      return d >= periodStart && d <= now;
    });
  }, [pointages, periodStart, now]);

  const periodFilteredBreaks = useMemo(() => {
    return breaks.filter((b) => {
      const d = new Date(b.date as unknown as string);
      return d >= periodStart && d <= now;
    });
  }, [breaks, periodStart, now]);

  const stats: EmployeeStats[] = useMemo(() => {
    const businessDays = countBusinessDays(periodStart, now);
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
  }, [team, periodFilteredPointages, periodFilteredBreaks, periodStart, now, overtimeThreshold]);

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

    showSuccess("📊 Rapport exporté avec succès");
  };

  const handleExportPdf = async () => {
    if (filteredStats.length === 0) {
      showInfo("Aucune donnée à exporter pour cette sélection.");
      return;
    }

    setIsExportingPdf(true);

    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 40;
      const headerHeight = 70;
      const footerHeight = 40;
      const rowHeight = 20;

      const primaryColor = rgb(0.11, 0.42, 0.76);
      const textColor = rgb(0.15, 0.15, 0.2);
      const mutedTextColor = rgb(0.4, 0.4, 0.45);
      const tableHeaderBg = rgb(0.95, 0.96, 0.98);
      const tableRowAltBg = rgb(0.985, 0.99, 1);

      const periodLabel =
        period === "day"
          ? "Aujourd'hui"
          : period === "week"
          ? "Semaine en cours"
          : period === "month"
          ? "Mois en cours"
          : "Trimestre en cours";

      const generatedAt = new Date().toLocaleString();

      let pageNumber = 0;

      const createPage = () => {
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        pageNumber += 1;

        page.drawRectangle({
          x: 0,
          y: height - headerHeight,
          width,
          height: headerHeight,
          color: primaryColor,
        });

        page.drawText("Rapport de l'équipe", {
          x: margin,
          y: height - headerHeight + 32,
          size: 20,
          font: fontBold,
          color: rgb(1, 1, 1),
        });

        page.drawText(`Période : ${periodLabel}`, {
          x: margin,
          y: height - headerHeight + 12,
          size: 11,
          font: fontRegular,
          color: rgb(0.93, 0.95, 1),
        });

        const summaryText = `Total heures : ${totalTeamHours}h  |  Moyenne : ${avgHours}h  |  Heures sup : ${totalOvertime}h`;
        page.drawText(summaryText, {
          x: margin,
          y: height - headerHeight - 10,
          size: 10,
          font: fontRegular,
          color: mutedTextColor,
        });

        page.drawText(`Généré le ${generatedAt}`, {
          x: margin,
          y: margin / 2,
          size: 9,
          font: fontRegular,
          color: mutedTextColor,
        });

        const pageLabel = `Page ${pageNumber}`;
        const pageLabelWidth = fontRegular.widthOfTextAtSize(pageLabel, 9);
        page.drawText(pageLabel, {
          x: width - margin - pageLabelWidth,
          y: margin / 2,
          size: 9,
          font: fontRegular,
          color: mutedTextColor,
        });

        const tableTopY = height - headerHeight - 34;
        const tableWidth = width - margin * 2;

        page.drawRectangle({
          x: margin,
          y: tableTopY - rowHeight + 4,
          width: tableWidth,
          height: rowHeight,
          color: tableHeaderBg,
        });

        const colNameWidth = tableWidth * 0.3;
        const colDeptWidth = tableWidth * 0.2;
        const colHoursWidth = tableWidth * 0.1;
        const colLateWidth = tableWidth * 0.1;
        const colAbsWidth = tableWidth * 0.15;

        const colNameX = margin + 10;
        const colDeptX = colNameX + colNameWidth;
        const colHoursX = colDeptX + colDeptWidth;
        const colLateX = colHoursX + colHoursWidth;
        const colAbsX = colLateX + colLateWidth;
        const colOvertimeX = colAbsX + colAbsWidth;

        page.drawText("Employé", {
          x: colNameX,
          y: tableTopY,
          size: 10,
          font: fontBold,
          color: textColor,
        });
        page.drawText("Département", {
          x: colDeptX,
          y: tableTopY,
          size: 10,
          font: fontBold,
          color: textColor,
        });
        page.drawText("Heures", {
          x: colHoursX,
          y: tableTopY,
          size: 10,
          font: fontBold,
          color: textColor,
        });
        page.drawText("Retards", {
          x: colLateX,
          y: tableTopY,
          size: 10,
          font: fontBold,
          color: textColor,
        });
        page.drawText("Absences", {
          x: colAbsX,
          y: tableTopY,
          size: 10,
          font: fontBold,
          color: textColor,
        });
        page.drawText("Heures sup", {
          x: colOvertimeX,
          y: tableTopY,
          size: 10,
          font: fontBold,
          color: textColor,
        });

        return {
          page,
          y: tableTopY - rowHeight,
          colNameX,
          colDeptX,
          colHoursX,
          colLateX,
          colAbsX,
          colOvertimeX,
          tableWidth,
        };
      };

      let {
        page,
        y,
        colNameX,
        colDeptX,
        colHoursX,
        colLateX,
        colAbsX,
        colOvertimeX,
        tableWidth,
      } = createPage();

      filteredStats.forEach((s, index) => {
        if (y < margin + footerHeight + rowHeight) {
          ({
            page,
            y,
            colNameX,
            colDeptX,
            colHoursX,
            colLateX,
            colAbsX,
            colOvertimeX,
            tableWidth,
          } = createPage());
        }

        const isAltRow = index % 2 === 1;

        if (isAltRow) {
          page.drawRectangle({
            x: margin,
            y: y - rowHeight + 4,
            width: tableWidth,
            height: rowHeight,
            color: tableRowAltBg,
          });
        }

        page.drawText(`${s.employee.firstname} ${s.employee.lastname}`, {
          x: colNameX,
          y,
          size: 10,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(s.employee.department || "-", {
          x: colDeptX,
          y,
          size: 10,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(`${s.totalHours}h`, {
          x: colHoursX,
          y,
          size: 10,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(String(s.lateCount), {
          x: colLateX,
          y,
          size: 10,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(String(s.absenceCount), {
          x: colAbsX,
          y,
          size: 10,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(`${s.overtimeHours}h`, {
          x: colOvertimeX,
          y,
          size: 10,
          font: fontRegular,
          color: textColor,
        });

        y -= rowHeight;
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "rapport-equipe.pdf";
      a.click();

      URL.revokeObjectURL(url);

      showSuccess("📄 Rapport PDF téléchargé avec succès");
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button onClick={handleExportPdf} disabled={isExportingPdf}>
            <Download className="mr-2 h-4 w-4" />
            {isExportingPdf ? "Génération..." : "Télécharger le PDF"}
          </Button>
        </div>
      </div>
    
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd&apos;hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
            </SelectContent>
          </Select>
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
            {period === "day"
              ? "Aujourd'hui"
              : period === "week"
              ? "Semaine en cours"
              : period === "month"
              ? "Mois en cours"
              : "Trimestre en cours"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={employeeStatsColumns} data={filteredStats} />
        </CardContent>
      </Card>
    </div>
  );
}
