"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";
import type { User, Pointage, Absence } from "@/generated/prisma/client";

interface ManagerPointagesClientProps {
  team: User[];
  pointages: Pointage[];
  absences: Absence[];
}

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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Pointages
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Pointages de mon équipe</h1>
        <p className="text-sm text-muted-foreground">
          Consultez les pointages, la présence et les absences de votre équipe en détail
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <Input
          placeholder="Rechercher un employé..."
          className="w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

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

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      Voir détails
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto border border-border/80 bg-card shadow-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {employee.firstname} {employee.lastname}
                      </DialogTitle>
                      <DialogDescription>
                        {employee.position} - {employee.department}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Derniers pointages
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="w-full overflow-x-auto">
                            <Table className="min-w-[640px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Entrée</TableHead>
                                  <TableHead>Sortie</TableHead>
                                  <TableHead>Durée</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {employeePointages.map((p) => {
                                  const d = new Date(
                                    p.date as unknown as string
                                  );
                                  return (
                                    <TableRow key={p.id}>
                                      <TableCell>
                                        {d.toLocaleDateString("fr-FR")}
                                      </TableCell>
                                      <TableCell>{p.entryTime || "-"}</TableCell>
                                      <TableCell>{p.exitTime || "-"}</TableCell>
                                      <TableCell>
                                        {p.duration > 0
                                          ? `${Math.floor(p.duration / 60)}h ${
                                              p.duration % 60
                                            }m`
                                          : "-"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Absences</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {employeeAbsences.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Aucune absence enregistrée
                            </p>
                          ) : (
                            <div className="w-full overflow-x-auto">
                              <Table className="min-w-[640px]">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Du</TableHead>
                                    <TableHead>Au</TableHead>
                                    <TableHead>Statut</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {employeeAbsences.map((a) => {
                                    const start = new Date(
                                      a.startDate as unknown as string
                                    );
                                    const end = new Date(
                                      a.endDate as unknown as string
                                    );
                                    return (
                                      <TableRow key={a.id}>
                                        <TableCell className="capitalize">
                                          {a.type}
                                        </TableCell>
                                        <TableCell>
                                          {start.toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell>
                                          {end.toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={
                                              a.status === "approved"
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {a.status === "approved"
                                              ? "Validé"
                                              : a.status === "rejected"
                                              ? "Refusé"
                                              : "En attente"}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </DialogContent>
                </Dialog>
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
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Entrée</TableHead>
                  <TableHead>Sortie</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayRows.map(({ employee, pointage }) => {
                  let durationLabel = "-";
                  if (pointage && pointage.duration > 0) {
                    durationLabel = `${Math.floor(pointage.duration / 60)}h ${
                      pointage.duration % 60
                    }m`;
                  }

                  let statusLabel = "Non pointé";
                  let statusVariant: "default" | "secondary" | "outline" | "destructive" =
                    "secondary";
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
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.firstname} {employee.lastname}
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{pointage?.entryTime || "-"}</TableCell>
                      <TableCell>{pointage?.exitTime || "-"}</TableCell>
                      <TableCell>{durationLabel}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant} className={statusClassName}>
                          {statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
