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
      const contextBg = rgb(0.98, 0.98, 0.985);

      const lateColor = rgb(0.8, 0.2, 0.2);
      const absenceColor = rgb(0.8, 0.45, 0.2);
      const overtimeColor = rgb(0.1, 0.55, 0.32);

      const periodLabel = rangeLabel || "Période sélectionnée";

      const departmentLabel =
        filterDepartment === "all"
          ? "Tous les départements"
          : `Département : ${filterDepartment}`;

      const employeesLabel = `${filteredStats.length} employé(s) dans ce rapport`;

      const generatedAt = new Date().toLocaleString();

      let pageNumber = 0;

      const createPage = (mode: "table" | "anomalies" = "table") => {
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        pageNumber += 1;

        // Bandeau d'en-tête principal
        page.drawRectangle({
          x: 0,
          y: height - headerHeight,
          width,
          height: headerHeight,
          color: primaryColor,
        });

        page.drawText("EliteTime – Rapport de l'équipe", {
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

        // Bloc de contexte (filtres, effectif)
        const tableWidth = width - margin * 2;
        const contextTopY = height - headerHeight - 28;
        const contextHeight = 32;

        page.drawRectangle({
          x: margin,
          y: contextTopY - contextHeight,
          width: tableWidth,
          height: contextHeight,
          color: contextBg,
        });

        page.drawText(departmentLabel, {
          x: margin + 8,
          y: contextTopY - 12,
          size: 9,
          font: fontRegular,
          color: mutedTextColor,
        });

        page.drawText(employeesLabel, {
          x: margin + 8,
          y: contextTopY - 24,
          size: 9,
          font: fontRegular,
          color: mutedTextColor,
        });

        // Pied de page (date de génération + pagination)
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

        // Début de la zone de contenu sous le bloc de contexte
        const tableTopY = contextTopY - contextHeight - 6;

        let colNameX = 0;
        let colDeptX = 0;
        let colHoursX = 0;
        let colLateX = 0;
        let colAbsX = 0;
        let colOvertimeX = 0;

        if (mode === "table") {
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

          colNameX = margin + 10;
          colDeptX = colNameX + colNameWidth;
          colHoursX = colDeptX + colDeptWidth;
          colLateX = colHoursX + colHoursWidth;
          colAbsX = colLateX + colLateWidth;
          colOvertimeX = colAbsX + colAbsWidth;

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
        }

        return {
          page,
          y: mode === "table" ? tableTopY - rowHeight : tableTopY,
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
          color: s.lateCount > 0 ? lateColor : textColor,
        });

        page.drawText(String(s.absenceCount), {
          x: colAbsX,
          y,
          size: 10,
          font: fontRegular,
          color: s.absenceCount > 0 ? absenceColor : textColor,
        });

        page.drawText(`${s.overtimeHours}h`, {
          x: colOvertimeX,
          y,
          size: 10,
          font: fontRegular,
          color: s.overtimeHours > 0 ? overtimeColor : textColor,
        });

        y -= rowHeight;
      });

      // Section r		sum		e des anomalies & alertes
      const anomalies = filteredStats.filter(
        (s) => s.lateCount > 0 || s.absenceCount > 0 || s.overtimeHours > 0
      );

      if (anomalies.length > 0) {
        let anomaliesPage = page;
        let anomaliesY = y - rowHeight;

        if (anomaliesY < margin + footerHeight + rowHeight * 4) {
          const newPage = createPage("anomalies");
          anomaliesPage = newPage.page;
          anomaliesY = newPage.y - rowHeight;
        }

        anomaliesPage.drawText("Anomalies & alertes", {
          x: margin,
          y: anomaliesY,
          size: 12,
          font: fontBold,
          color: textColor,
        });
        anomaliesY -= rowHeight;

        anomalies.forEach((s) => {
          if (anomaliesY < margin + footerHeight + rowHeight) {
            const newPage = createPage("anomalies");
            anomaliesPage = newPage.page;
            anomaliesY = newPage.y - rowHeight;
          }

          const parts: string[] = [];
          if (s.lateCount > 0) parts.push(`${s.lateCount} retard(s)`);
          if (s.absenceCount > 0) parts.push(`${s.absenceCount} absence(s)`);
          if (s.overtimeHours > 0) parts.push(`${s.overtimeHours}h sup`);

          const line = `${s.employee.firstname} ${s.employee.lastname} – ${parts.join(
            " · "
          )}`;

          anomaliesPage.drawText(line, {
            x: margin,
            y: anomaliesY,
            size: 10,
            font: fontRegular,
            color: textColor,
          });

          anomaliesY -= rowHeight;
        });
      }

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
