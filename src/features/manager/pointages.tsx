"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { User, Pointage, Absence } from "@/generated/prisma/client";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

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

  const weekRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, []);

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
      team
        .filter(
          (employee) =>
            departmentFilter === "all" || employee.department === departmentFilter
        )
        .map((employee) => {
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
    [team, todayPointages, departmentFilter]
  );

  const getEmployeeDetails = (employeeId: string) => {
    const employeePointages = pointages
      .filter((p) => p.userId === employeeId)
      .sort(
        (a, b) =>
          new Date(b.date as unknown as string).getTime() -
          new Date(a.date as unknown as string).getTime()
      )
      .slice(0, 10);

    const employeeAbsences = absences
      .filter((a) => a.userId === employeeId)
      .sort(
        (a, b) =>
          new Date(b.startDate as unknown as string).getTime() -
          new Date(a.startDate as unknown as string).getTime()
      );

    return { pointages: employeePointages, absences: employeeAbsences };
  };

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

        let statusLabel = "Non pointé";
        let statusVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";
        let statusClassName = "";

        if (pointage) {
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
          <Button asChild variant="outline" className="mt-1 md:mt-0">
            <Link href="/pointages/manual">
              Saisie manuelle
            </Link>
          </Button>
        </div>
      </div>

      

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeam.map((employee) => {
          const isPresent = presentToday.some((p) => p.userId === employee.id);
          const { pointages: employeePointages, absences: employeeAbsences } =
            getEmployeeDetails(employee.id);
          const weekHours = Math.floor(
            employeePointages
              .filter((p) => {
                const d = new Date(p.date as unknown as string);
                return d >= weekRange.start && d <= weekRange.end;
              })
              .reduce((sum, p) => sum + p.duration, 0) / 60
          );

          return (
            <Card
              key={employee.id}
              className="border border-border/80 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{employee.avatar}</div>
                    <div>
                      <CardTitle className="text-lg">
                        {employee.firstname} {employee.lastname}
                      </CardTitle>
                      <CardDescription>{employee.position}</CardDescription>
                    </div>
                  </div>
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isPresent ? "bg-success animate-pulse" : "bg-muted"
                    }`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <Badge
                    variant={isPresent ? "default" : "secondary"}
                    className={isPresent ? "bg-success" : ""}
                  >
                    {isPresent ? "Présent" : "Absent"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Heures (semaine)</span>
                  <span className="font-semibold">{weekHours}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Département</span>
                  <span className="text-sm">{employee.department}</span>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/pointages/${employee.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir détails
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
