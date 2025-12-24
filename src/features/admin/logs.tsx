"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, Filter } from "lucide-react";
import type { ActivityLog, User } from "@/generated/prisma/client";

interface ActivityLogWithUser extends ActivityLog {
  user: User | null;
}

interface LogsClientProps {
  logs: ActivityLogWithUser[];
}

export default function LogsClient({ logs }: LogsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");

  const [filterPeriod, setFilterPeriod] = useState<string>("all");

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
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { type: "auth", label: "Connexions", count: periodFilteredLogs.filter((l) => l.type === "auth").length },
          { type: "pointage", label: "Pointages", count: periodFilteredLogs.filter((l) => l.type === "pointage").length },
          { type: "absence", label: "Absences", count: periodFilteredLogs.filter((l) => l.type === "absence").length },
          { type: "user", label: "Utilisateurs", count: periodFilteredLogs.filter((l) => l.type === "user").length },
          { type: "validation", label: "Validations", count: periodFilteredLogs.filter((l) => l.type === "validation").length },
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
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="search">Recherche</Label>
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
            <div>
              <Label>Type d&apos;action</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="auth">Connexions</SelectItem>
                  <SelectItem value="pointage">Pointages</SelectItem>
                  <SelectItem value="absence">Absences</SelectItem>
                  <SelectItem value="user">Utilisateurs</SelectItem>
                  <SelectItem value="validation">Validations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Utilisateur</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
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
            <div>
              <Label>Période</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger>
                  <SelectValue />
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
        <CardHeader>
          <CardTitle>Historique des activités ({filteredLogs.length})</CardTitle>
          <CardDescription>Toutes les actions importantes effectuées dans le système</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun log trouvé</p>
            ) : (
              filteredLogs.map((log) => {
                const user = log.user;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="text-3xl">{user?.avatar || "👤"}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {user ? `${user.firstname || ""} ${user.lastname || ""}`.trim() : "Utilisateur supprimé"}
                        </p>
                        {getTypeBadge(log.type)}
                      </div>
                      <p className="text-sm font-semibold text-primary">{log.action}</p>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
