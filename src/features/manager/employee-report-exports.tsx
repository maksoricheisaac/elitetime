"use client";

import { useState } from "react";
import type { EmployeePointageDetailRow } from "@/features/manager/employee-pointages-detail-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useNotification } from "@/contexts/notification-context";
import { formatMinutesHuman } from "@/lib/time-format";

interface EmployeeReportExportsProps {
  employee: {
    firstname: string;
    lastname: string;
    department?: string | null;
  };
  from: string; // ISO
  to: string; // ISO
  rows: EmployeePointageDetailRow[];
  totalHours: number;
  lateCount: number;
  absenceCount: number;
  overtimeHours: number;
}

function buildEmployeeSlug(firstname: string, lastname: string) {
  const base = `${firstname} ${lastname}`.trim() || "employe";
  return base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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

export function EmployeeReportExports({
  employee,
  from,
  to,
  rows,
  totalHours,
  lateCount,
  absenceCount,
  overtimeHours,
}: EmployeeReportExportsProps) {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const hasData = rows.length > 0;
  const fileSlug = buildEmployeeSlug(employee.firstname, employee.lastname);

  const handleExportCsv = async () => {
    if (!hasData) {
      showInfo("Aucune donnée à exporter pour cette période.");
      return;
    }

    const header = [
      "Date",
      "Heure d'entrée",
      "Heure de sortie",
      "Durée",
      "Pause",
      "Statut",
    ];

    const dataRows = rows.map((r) => {
      const d = new Date(r.date);
      const dateLabel = d.toLocaleDateString("fr-FR");
      const durationLabel = formatMinutesHuman(r.duration ?? 0);
      const pauseLabel = formatMinutesHuman(r.pauseMinutes ?? 0);

      return [
        dateLabel,
        r.entryTime ?? "",
        r.exitTime ?? "",
        durationLabel,
        pauseLabel,
        r.status ?? "",
      ];
    });

    const allRows = [header, ...dataRows];
    const csv = allRows.map((row) => row.map((v) => `"${v}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${fileSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    const periodDetails = `Employé: ${employee.firstname} ${employee.lastname} – période ${new Date(from).toLocaleDateString("fr-FR")} à ${new Date(to).toLocaleDateString("fr-FR")}`;
    void logReportExport("EMPLOYEE_REPORT_CSV", periodDetails);

    showSuccess("Rapport CSV exporté avec succès");
  };

  const handleExportPdf = async () => {
    if (!hasData) {
      showInfo("Aucune donnée à exporter pour cette période.");
      return;
    }

    try {
      setIsExportingPdf(true);

      const periodDetails = `Employé: ${employee.firstname} ${employee.lastname} – période ${new Date(from).toLocaleDateString("fr-FR")} à ${new Date(to).toLocaleDateString("fr-FR")}`;
      void logReportExport("EMPLOYEE_REPORT_PDF", periodDetails);

      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      const margin = 40;
      const headerHeight = 70;
      const rowHeight = 18;

      const primaryColor = rgb(0.11, 0.42, 0.76);
      const textColor = rgb(0.15, 0.15, 0.2);
      const mutedTextColor = rgb(0.4, 0.4, 0.45);
      const tableHeaderBg = rgb(0.95, 0.96, 0.98);
      const tableRowAltBg = rgb(0.985, 0.99, 1);

      // Header
      page.drawRectangle({
        x: 0,
        y: height - headerHeight,
        width,
        height: headerHeight,
        color: primaryColor,
      });

      page.drawText("EliteTime – Rapport détaillé", {
        x: margin,
        y: height - headerHeight + 36,
        size: 20,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      const employeeLabel = `${employee.firstname} ${employee.lastname}`.trim();
      const displayEmployeeLabel =
        employeeLabel.length > 40 ? `${employeeLabel.slice(0, 39)}…` : employeeLabel;
      page.drawText(displayEmployeeLabel, {
        x: margin,
        y: height - headerHeight + 16,
        size: 12,
        font: fontRegular,
        color: rgb(0.93, 0.95, 1),
      });

      const periodLabel = `Période : ${new Date(from).toLocaleDateString("fr-FR")} – ${new Date(to).toLocaleDateString("fr-FR")}`;
      page.drawText(periodLabel, {
        x: margin,
        y: height - headerHeight,
        size: 10,
        font: fontRegular,
        color: rgb(0.93, 0.95, 1),
      });

      // Résumé
      const summaryTop = height - headerHeight - 24;
      page.drawText(`Heures travaillées : ${formatMinutesHuman(totalHours * 60)}`, {
        x: margin,
        y: summaryTop,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      page.drawText(`Retards : ${lateCount}`, {
        x: margin,
        y: summaryTop - 14,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      page.drawText(`Absences estimées : ${absenceCount}`, {
        x: margin,
        y: summaryTop - 28,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      page.drawText(`Heures supplémentaires : ${formatMinutesHuman(overtimeHours * 60)}`, {
        x: margin,
        y: summaryTop - 42,
        size: 10,
        font: fontRegular,
        color: textColor,
      });

      // Table header
      const tableTop = summaryTop - 64;
      const tableWidth = width - margin * 2;

      page.drawRectangle({
        x: margin,
        y: tableTop - rowHeight + 4,
        width: tableWidth,
        height: rowHeight,
        color: tableHeaderBg,
      });

      const colDateX = margin + 8;
      const colEntryX = colDateX + tableWidth * 0.2;
      const colExitX = colEntryX + tableWidth * 0.2;
      const colDurationX = colExitX + tableWidth * 0.2;
      const colPauseX = colDurationX + tableWidth * 0.2;

      page.drawText("Date", {
        x: colDateX,
        y: tableTop,
        size: 10,
        font: fontBold,
        color: textColor,
      });
      page.drawText("Entrée", {
        x: colEntryX,
        y: tableTop,
        size: 10,
        font: fontBold,
        color: textColor,
      });
      page.drawText("Sortie", {
        x: colExitX,
        y: tableTop,
        size: 10,
        font: fontBold,
        color: textColor,
      });
      page.drawText("Durée", {
        x: colDurationX,
        y: tableTop,
        size: 10,
        font: fontBold,
        color: textColor,
      });
      page.drawText("Pause", {
        x: colPauseX,
        y: tableTop,
        size: 10,
        font: fontBold,
        color: textColor,
      });

      let y = tableTop - rowHeight;

      rows.forEach((r, index) => {
        if (y < margin + rowHeight) return; // simple overflow guard

        const isAlt = index % 2 === 1;
        if (isAlt) {
          page.drawRectangle({
            x: margin,
            y: y - rowHeight + 4,
            width: tableWidth,
            height: rowHeight,
            color: tableRowAltBg,
          });
        }

        const d = new Date(r.date);
        const dateLabel = d.toLocaleDateString("fr-FR");
        const durationHours = (r.duration ?? 0) / 60;

        page.drawText(dateLabel, {
          x: colDateX,
          y,
          size: 9,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(r.entryTime ?? "-", {
          x: colEntryX,
          y,
          size: 9,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(r.exitTime ?? "-", {
          x: colExitX,
          y,
          size: 9,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(`${durationHours.toFixed(2).replace(".", ",")}h`, {
          x: colDurationX,
          y,
          size: 9,
          font: fontRegular,
          color: textColor,
        });

        page.drawText(`${r.pauseMinutes ?? 0} min`, {
          x: colPauseX,
          y,
          size: 9,
          font: fontRegular,
          color: textColor,
        });

        y -= rowHeight;
      });

      const generatedAt = new Date().toLocaleString();
      const footerText = `Généré le ${generatedAt}`;
      page.drawText(footerText, {
        x: margin,
        y: margin / 2,
        size: 9,
        font: fontRegular,
        color: mutedTextColor,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-${fileSlug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      showSuccess(" Rapport PDF téléchargé avec succès");
    } catch (error) {
      console.error(error);
      showError("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button className="cursor-pointer" variant="outline" size="sm" onClick={handleExportCsv} disabled={!hasData}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        <span>CSV</span>
      </Button>
      <Button className="cursor-pointer" size="sm" onClick={handleExportPdf} disabled={!hasData || isExportingPdf}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        <span>{isExportingPdf ? "Génération..." : "PDF"}</span>
      </Button>
    </div>
  );
}
