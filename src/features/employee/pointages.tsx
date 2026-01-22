"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { Pointage } from "@/generated/prisma/client";
import { PresenceChart } from "@/components/charts/presence-chart";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface EmployeePointagesClientProps {
  pointages: Pointage[];
  canEdit: boolean;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "normal":
      return (
        <Badge
          variant="outline"
          className="border-border bg-muted text-emerald-700 dark:bg-muted/40 dark:text-emerald-200"
        >
          Normal
        </Badge>
      );
    case "late":
      return (
        <Badge
          variant="outline"
          className="border-border bg-muted text-amber-700 dark:bg-muted/40 dark:text-amber-300"
        >
          Retard
        </Badge>
      );
    case "incomplete":
      return (
        <Badge
          variant="outline"
          className="border-border bg-muted text-primary dark:bg-muted/40 dark:text-primary"
        >
          Incomplet
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const pointagesColumns: ColumnDef<Pointage>[] = [
  {
    accessorKey: "date",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Date
      </span>
    ),
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {new Date(row.original.date).toLocaleDateString("fr-FR")}
      </span>
    ),
  },
  {
    accessorKey: "entryTime",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Entrée
      </span>
    ),
    cell: ({ row }) => <span>{row.original.entryTime || "-"}</span>,
  },
  {
    accessorKey: "exitTime",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sortie
      </span>
    ),
    cell: ({ row }) => <span>{row.original.exitTime || "-"}</span>,
  },
  {
    accessorKey: "duration",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Durée
      </span>
    ),
    cell: ({ row }) => {
      const duration = row.original.duration ?? 0;
      if (duration <= 0) return <span>-</span>;
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return (
        <span>
          {hours}h {minutes}m
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Statut
      </span>
    ),
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
];

export default function EmployeePointagesClient({ pointages }: EmployeePointagesClientProps) {
  const [range, setRange] = useState<"week" | "month">("month");
  const days = range === "week" ? 7 : 30;
  const rangeLabel = range === "week" ? "7 derniers jours" : "30 derniers jours";

  const userPointages = pointages
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  const presenceData = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - ((days - 1) - i));

    const hasPointage = userPointages.some((p) => {
      const pDate = new Date(p.date);
      return (
        pDate.getFullYear() === date.getFullYear() &&
        pDate.getMonth() === date.getMonth() &&
        pDate.getDate() === date.getDate()
      );
    });

    const presents = hasPointage ? 1 : 0;
    const absents = hasPointage ? 0 : 1;

    return {
      date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      presents,
      absents,
      total: presents + absents,
    };
  });

  const workDurationData = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - ((days - 1) - i));

    const dayPointages = userPointages.filter((p) => {
      const pDate = new Date(p.date);
      return (
        pDate.getFullYear() === date.getFullYear() &&
        pDate.getMonth() === date.getMonth() &&
        pDate.getDate() === date.getDate()
      );
    });

    const totalDurationMinutes = dayPointages.reduce((sum, p) => sum + (p.duration || 0), 0);
    const durationHours = totalDurationMinutes / 60;
    const hasPointage = dayPointages.length > 0;
    const hasLate = dayPointages.some((p) => p.status === "late");
    const hasIncomplete = dayPointages.some((p) => p.status === "incomplete");

    return {
      date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      durationHours,
      hasPointage,
      hasLate,
      hasIncomplete,
    };
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Mes pointages
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de votre présence et des 30 derniers pointages enregistrés.
        </p>
      </div>

      <div className="flex justify-end">
        <Select value={range} onValueChange={(value: "week" | "month") => setRange(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">7 derniers jours</SelectItem>
            <SelectItem value="month">30 derniers jours</SelectItem>
          </SelectContent>
        </Select>

      </div>

      <div className="grid grid-cols-2 gap-5">
        <PresenceChart
          data={presenceData}
          title={`Mes présences sur les ${rangeLabel}`}
          description={`Présence ou absence quotidienne sur les ${rangeLabel.toLowerCase()}`}
        />

        <Card className="border border-primary/20 rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Clock className="h-5 w-5 text-primary" />
              <span>Durée de travail quotidienne</span>
            </CardTitle>
            <CardDescription>
              Heures travaillées par jour sur les {rangeLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={workDurationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Heures", angle: -90, position: "insideLeft", offset: 10 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as (typeof workDurationData)[number];
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                          <div className="font-medium mb-1">{label}</div>
                          <div className="flex flex-col gap-1">
                            <span>
                              <span className="text-[0.70rem] uppercase text-muted-foreground mr-1">Durée</span>
                              <span className="font-bold">{data.durationHours.toFixed(2)} h</span>
                            </span>
                            {data.hasPointage ? (
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {data.hasLate
                                  ? "Statut : Retard"
                                  : data.hasIncomplete
                                  ? "Statut : Incomplet"
                                  : "Statut : Normal"}
                              </span>
                            ) : (
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Aucun pointage</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="durationHours"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      

      <Card className="border border-primary/20 rounded-xl shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Clock className="h-5 w-5 text-primary" />
            <span>Historique des pointages</span>
          </CardTitle>
          <CardDescription>
            Vue simplifiée de vos derniers pointages avec les informations essentielles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={pointagesColumns} data={userPointages} />
        </CardContent>
      </Card>
    </div>
  );
}
