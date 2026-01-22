"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Search, Filter, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import type { ActivityLog, User } from "@/generated/prisma/client";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface ActivityLogWithUser extends ActivityLog {
  user: User | null;
}

interface LogsClientProps {
  logs: ActivityLogWithUser[];
}

const logColumns: ColumnDef<ActivityLogWithUser>[] = [
  {
    accessorKey: "user",
    header: () => <span>Utilisateur</span>,
    cell: ({ row }) => {
      const user = row.original.user;
      if (!user) {
        return <span>Utilisateur supprimé</span>;
      }
      const label = `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.email;
      return <span>{label}</span>;
    },
  },
  {
    accessorKey: "type",
    header: () => <span>Type</span>,
    cell: ({ row }) => <span>{row.original.type}</span>,
  },
  {
    accessorKey: "action",
    header: () => <span>Action</span>,
    cell: ({ row }) => <span className="font-medium">{row.original.action}</span>,
  },
  {
    accessorKey: "details",
    header: () => <span>Détails</span>,
    cell: ({ row }) => (
      <span className="max-w-[360px] truncate" title={row.original.details}>
        {row.original.details}
      </span>
    ),
  },
  {
    accessorKey: "timestamp",
    header: () => <span>Date &amp; heure</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {new Date(row.original.timestamp).toLocaleString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    ),
  },
];

export default function LogsClient({ logs }: LogsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");

  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const now = new Date();

  const periodFilteredLogs = logs.filter((log) => {
    if (filterPeriod === "all") {
      return true;
    }

    const logDate = new Date(log.timestamp);

    let fromDate: Date | null = null;
    if (filterPeriod === "24h") {
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (filterPeriod === "7d") {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterPeriod === "30d") {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (!fromDate) {
      return true;
    }

    return logDate >= fromDate && logDate <= now;
  });

  const filteredLogs = periodFilteredLogs.filter((log) => {
    const user = log.user;
    const matchSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user?.firstname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user?.lastname || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = filterType === "all" || log.type === filterType;
    const matchUser = filterUser === "all" || log.userId === filterUser;

    return matchSearch && matchType && matchUser;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      auth: "default",
      pointage: "secondary",
      absence: "outline",
      user: "default",
      validation: "default",
    };
    const colors: Record<string, string> = {
      auth: "bg-primary",
      pointage: "bg-success",
      absence: "bg-warning",
      user: "bg-destructive",
      validation: "bg-accent",
    };
    return (
      <Badge variant={variants[type]} className={colors[type]}>
        {type}
      </Badge>
    );
  };

  const uniqueUsers = Array.from(
    new Map(
      logs
        .filter((log) => log.user)
        .map((log) => [log.user!.id, log.user as User])
    ).values()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logs & Activité</h1>
        <p className="text-muted-foreground">Historique des actions et événements système</p>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { type: "auth", label: "Connexions", count: periodFilteredLogs.filter((l) => l.type === "auth").length },
          { type: "pointage", label: "Pointages", count: periodFilteredLogs.filter((l) => l.type === "pointage").length },
          { type: "absence", label: "Absences", count: periodFilteredLogs.filter((l) => l.type === "absence").length },
          { type: "user", label: "Utilisateurs", count: periodFilteredLogs.filter((l) => l.type === "user").length }
        ].map((stat) => (
          <Card key={stat.type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
              {getTypeBadge(stat.type)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm text-muted-foreground">Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Action, utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Type d&apos;action</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="auth">Connexions</SelectItem>
                  <SelectItem value="pointage">Pointages</SelectItem>
                  <SelectItem value="user">Utilisateurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Utilisateur</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstname} {user.lastname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Période</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger>
                  <SelectValue className="w-50"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="24h">Dernières 24h</SelectItem>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des logs */}
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Historique des activités ({filteredLogs.length})</CardTitle>
            <CardDescription>
              Toutes les actions importantes effectuées dans le système
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => window.print()}
              disabled={filteredLogs.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              <span>Imprimer</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucun log trouvé</p>
          ) : (
            <>
              <DataTable columns={logColumns} data={paginatedLogs} />
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {currentPage} sur {totalPages} — {filteredLogs.length} log(s)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Précédent</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <span>Suivant</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
