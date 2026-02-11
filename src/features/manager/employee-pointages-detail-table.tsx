"use client";

import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatMinutesHuman } from "@/lib/time-format";

export interface EmployeePointageDetailRow {
  id: string;
  date: string; // ISO string
  entryTime: string | null;
  exitTime: string | null;
  duration: number | null;
  status: string | null;
  pauseMinutes: number;
  lateMinutes?: number;
}

interface EmployeePointagesDetailTableProps {
  rows: EmployeePointageDetailRow[];
}

function formatMinutesHHMM(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

const columns: ColumnDef<EmployeePointageDetailRow>[] = [
  {
    accessorKey: "date",
    header: () => <span>Date</span>,
    cell: ({ row }) => {
      const d = new Date(row.original.date);
      return <span className="whitespace-nowrap">{d.toLocaleDateString("fr-FR")}</span>;
    },
  },
  {
    accessorKey: "entryTime",
    header: () => <span>Entrée</span>,
    cell: ({ row }) => <span>{row.original.entryTime || "-"}</span>,
  },
  {
    accessorKey: "exitTime",
    header: () => <span>Sortie</span>,
    cell: ({ row }) => <span>{row.original.exitTime || "-"}</span>,
  },
  {
    accessorKey: "duration",
    header: () => <span>Durée</span>,
    cell: ({ row }) => {
      const duration = row.original.duration;
      if (!duration || duration <= 0) {
        return <span>-</span>;
      }
      return <span>{formatMinutesHuman(duration)}</span>;
    },
  },
  {
    accessorKey: "lateMinutes",
    header: () => <span>Retard</span>,
    cell: ({ row }) => {
      const late = row.original.lateMinutes ?? 0;
      if (!late || late <= 0) {
        return <span>-</span>;
      }
      return <span className="text-destructive font-medium">{formatMinutesHHMM(late)}</span>;
    },
  },
  {
    accessorKey: "pauseMinutes",
    header: () => <span>Pauses</span>,
    cell: ({ row }) => {
      const pauseMinutes = row.original.pauseMinutes;
      if (!pauseMinutes || pauseMinutes <= 0) {
        return <span>-</span>;
      }
      return <span>{formatMinutesHuman(pauseMinutes)}</span>;
    },
  },
  {
    id: "status",
    header: () => <span>Statut</span>,
    cell: ({ row }) => {
      const status = row.original.status;

      let label = "Normal";
      let variant: "default" | "secondary" | "outline" | "destructive" = "outline";

      if (status === "late") {
        label = "Retard";
        variant = "destructive";
      } else if (status === "incomplete") {
        label = "Incomplet";
        variant = "secondary";
      }

      return <Badge variant={variant}>{label}</Badge>;
    },
  },
];

export function EmployeePointagesDetailTable({ rows }: EmployeePointagesDetailTableProps) {
  return <DataTable columns={columns} data={rows} />;
}
