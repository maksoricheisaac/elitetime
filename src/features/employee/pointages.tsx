"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { Pointage } from "@/generated/prisma/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface EmployeePointagesClientProps {
  pointages: Pointage[];
}

export default function EmployeePointagesClient({ pointages }: EmployeePointagesClientProps) {

  const userPointages = pointages
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("30");
  const [page, setPage] = useState<number>(1);

  const filteredPointages = userPointages.filter((p) => {
    const matchesStatus =
      statusFilter === "all" ? true : p.status === statusFilter;

    if (periodFilter === "all") {
      return matchesStatus;
    }

    const days = parseInt(periodFilter, 10);
    if (Number.isNaN(days)) {
      return matchesStatus;
    }

    const now = new Date();
    const since = new Date();
    since.setDate(now.getDate() - days);

    const pointageDate = new Date(p.date);
    const matchesPeriod = pointageDate >= since && pointageDate <= now;

    return matchesStatus && matchesPeriod;
  });

  const itemsPerPage = 10;
  const totalPointages = userPointages.length;
  const lateCount = userPointages.filter((p) => p.status === "late").length;
  const incompleteCount = userPointages.filter((p) => p.status === "incomplete").length;
  const totalPages = Math.max(1, Math.ceil(filteredPointages.length / itemsPerPage));
  const paginatedPointages = filteredPointages.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const filteredLateCount = filteredPointages.filter((p) => p.status === "late").length;
  const totalWorkedMinutes = filteredPointages.reduce(
    (sum, p) => sum + (p.duration || 0),
    0
  );
  const totalWorkedHours = Math.floor(totalWorkedMinutes / 60);
  const totalWorkedRemainingMinutes = totalWorkedMinutes % 60;
  const totalWorkedFormatted = `${totalWorkedHours
    .toString()
    .padStart(2, "0")}:${totalWorkedRemainingMinutes
    .toString()
    .padStart(2, "0")}`;

  const getStatusBadge = (status: string) => {
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
            className="border-border bg-muted text-sky-700 dark:bg-muted/40 dark:text-sky-300"
          >
            Incomplet
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Mes pointages
        </h1>
        <p className="text-sm text-muted-foreground">
          Historique des 30 derniers jours
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-none bg-primary/5 shadow-sm rounded-xl">
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Pointages</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
              {filteredPointages.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-amber-500/10 shadow-sm rounded-xl">
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Retards</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-amber-700 dark:text-amber-300">
              {filteredLateCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-emerald-500/10 shadow-sm rounded-xl">
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Heures travaillées</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">
              {totalWorkedFormatted}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-primary/20 bg-card rounded-xl shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Clock className="h-5 w-5 text-primary" />
            <span>Historique des pointages</span>
          </CardTitle>
          <CardDescription>
            Consultez vos pointages récents et filtrez-les par statut ou période.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger 
                      className="h-8 rounded-md border bg-background px-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <SelectValue placeholder="Selectionnez un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Status</SelectLabel>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="normal">Normaux</SelectItem>
                        <SelectItem value="late">Retards</SelectItem>
                        <SelectItem value="incomplete">Incomplets</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Période
                  </Label>
                  <Select
                    value={periodFilter}
                    onValueChange={(value) => {
                      setPeriodFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger 
                      className="h-8 rounded-md border bg-background px-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <SelectValue placeholder="Selectionnez une période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Période</SelectLabel>
                        <SelectItem value="7">7 derniers jours</SelectItem>
                        <SelectItem value="30">30 derniers jours</SelectItem>
                        <SelectItem value="all">Tout l&apos;historique chargé</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1 text-right text-xs text-muted-foreground">
                <p>{filteredPointages.length} pointage(s) affiché(s)</p>
                <p>
                  {totalPointages} au total • {lateCount} retard(s) • {incompleteCount} incomplet(s)
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[720px] text-sm">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Entrée
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sortie
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Durée
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Statut
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPointages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Aucun pointage ne correspond aux filtres sélectionnés.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPointages.map((pointage) => (
                    <TableRow
                      key={pointage.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(pointage.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>{pointage.entryTime || "-"}</TableCell>
                      <TableCell>{pointage.exitTime || "-"}</TableCell>
                      <TableCell>
                        {pointage.duration > 0
                          ? `${Math.floor(pointage.duration / 60)}h ${pointage.duration % 60}m`
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(pointage.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredPointages.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) {
                          setPage(page - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === page}
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < totalPages) {
                          setPage(page + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
