"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import type { User, Pointage, Absence } from "@/generated/prisma/client";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { PresenceChart } from "@/components/charts/presence-chart";

interface ManagerPointagesClientProps {
  team: User[];
  pointages: Pointage[];
  absences: Absence[];
}

type TodayRow = {
  employee: User;
  pointage: Pointage | null;
};

export default function ManagerPointagesClient({ team, pointages, absences }: ManagerPointagesClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [range, setRange] = useState<"week" | "month">("week");

  const days = range === "week" ? 7 : 30;
  const rangeLabel = range === "week" ? "7 derniers jours" : "30 derniers jours";

  const todayKey = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toDateString();
  }, []);

  const todayPointages = useMemo(
    () =>
      pointages.filter((p) => {
        const d = new Date(p.date as unknown as string);
        return d.toDateString() === todayKey;
      }),
    [pointages, todayKey]
  );

  const presentToday = useMemo(
    () => todayPointages.filter((p) => p.isActive),
    [todayPointages]
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
      const date = new Date();
      date.setDate(date.getDate() - ((days - 1) - i));

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
  }, [days, pointages, team]);

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
      const isPresent = presentToday.some((p) => p.userId === employee.id);

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
  }, [team, presentToday, searchTerm, statusFilter, departmentFilter]);

  const todayRows = useMemo(
    () =>
      filteredTeam.map((employee) => {
        const employeeTodayPointages = todayPointages
          .filter((p) => p.userId === employee.id)
          .sort(
            (a, b) =>
              new Date(b.date as unknown as string).getTime() -
              new Date(a.date as unknown as string).getTime()
          );

        const lastPointage = employeeTodayPointages[0] ?? null;

        return { employee, pointage: lastPointage };
      }),
    [filteredTeam, todayPointages]
  );

  const totalEmployees = team.length;
  const presentCount = new Set(presentToday.map((p) => p.userId)).size;
  const onLeaveCount = onLeaveTodayIds.size;
  const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

  const todayColumns: ColumnDef<TodayRow>[] = [
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
      cell: ({ row }) => <span>{row.original.pointage?.entryTime || "-"}</span>,
    },
    {
      accessorKey: "exitTime",
      header: () => <span>Sortie</span>,
      cell: ({ row }) => <span>{row.original.pointage?.exitTime || "-"}</span>,
    },
    {
      accessorKey: "duration",
      header: () => <span>Durée</span>,
      cell: ({ row }) => {
        const pointage = row.original.pointage;
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
        const pointage = row.original.pointage;
        const employee = row.original.employee;
        const isOnLeave = onLeaveTodayIds.has(employee.id);

        let statusLabel = "Non pointé";
        let statusVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";
        let statusClassName = "";

        if (!pointage && isOnLeave) {
          statusLabel = "En congé";
          statusVariant = "secondary";
        } else if (pointage) {
          if (pointage.isActive) {
            statusLabel = "En activité";
            statusVariant = "default";
            statusClassName = "bg-success text-white";
          } else if (pointage.status === "late") {
            statusLabel = "En retard";
            statusVariant = "destructive";
          } else if (pointage.status === "incomplete") {
            statusLabel = "Incomplet";
            statusVariant = "secondary";
          } else {
            statusLabel = "Terminé";
            statusVariant = "outline";
          }
        }

        return (
          <Badge variant={statusVariant} className={statusClassName}>
            {statusLabel}
          </Badge>
        );
      },
    },
  ];

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
            <Select value={range} onValueChange={(value: "week" | "month") => setRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 derniers jours</SelectItem>
                <SelectItem value="month">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>
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
            title={`Présence de l&apos;équipe sur les ${rangeLabel}`}
            description={`Nombre de collaborateurs présents et absents sur les ${rangeLabel.toLowerCase()}`}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pointages du jour</CardTitle>
          <CardDescription>
            Liste des pointages du jour pour tous les employés de l&apos;équipe
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
            )}
            
          </div>
          <DataTable columns={todayColumns} data={todayRows} />
        </CardContent>
      </Card>
    </div>
  );
}
