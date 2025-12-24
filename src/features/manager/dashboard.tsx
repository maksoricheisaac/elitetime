"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";
import type { User, Pointage } from "@/generated/prisma/client";

interface ManagerDashboardClientProps {
  team: User[];
  todayPointages: (Pointage & { user: User })[];
}

export default function ManagerDashboardClient({ team, todayPointages }: ManagerDashboardClientProps) {

  const dailyPercentages = useMemo(
    () => Array.from({ length: 7 }, (_, i) => 60 + ((i * 5) % 40)),
    []
  );

  const presentToday = todayPointages.filter((p) => p.isActive);
  const lateToday = todayPointages.filter((p) => p.status === "late");
  const notPointedToday = team.filter(
    (emp) => !todayPointages.some((p) => p.userId === emp.id)
  );

  const avgPresence = team.length > 0 ? Math.round((presentToday.length / team.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Vue manager
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord manager</h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de votre équipe et de la présence en temps réel
        </p>
        
      </div>

      
  
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.length}</div>
            <p className="text-xs text-muted-foreground">Dans votre équipe</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Présents</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentToday.length}</div>
            <p className="text-xs text-muted-foreground">En activité maintenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retards</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lateToday.length}</div>
            <p className="text-xs text-muted-foreground">Aujourd&apos;hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de présence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPresence}%</div>
            <p className="text-xs text-muted-foreground">Présence aujourd&apos;hui</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Présence en temps réel</CardTitle>
          <CardDescription>Qui est au bureau maintenant?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {team.slice(0, 9).map((employee) => {
              const isPresent = presentToday.some((p) => p.userId === employee.id);
              return (
                <div
                  key={employee.id}
                  className="flex items-center gap-3 rounded-lg border border-border/80 bg-card/90 p-3 shadow-sm transition-colors hover:bg-accent/40"
                >
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isPresent ? "bg-success animate-pulse" : "bg-muted"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {employee.firstname} {employee.lastname}
                    </p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                  <Badge
                    variant={isPresent ? "default" : "secondary"}
                    className={isPresent ? "bg-success" : ""}
                  >
                    {isPresent ? "Présent" : "Absent"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Retards du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lateToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun retard aujourd&apos;hui 
              </p>
            ) : (
              <ul className="space-y-2">
                {lateToday.map((pointage) => (
                  <li
                    key={pointage.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {pointage.user?.firstname} {pointage.user?.lastname}
                    </span>
                    <Badge variant="destructive">{pointage.entryTime}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Non pointés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notPointedToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tout le monde a pointé 
              </p>
            ) : (
              <ul className="space-y-2">
                {notPointedToday.map((employee) => (
                  <li
                    key={employee.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {employee.firstname} {employee.lastname}
                    </span>
                    <Badge variant="secondary">Non pointé</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taux de présence hebdomadaire</CardTitle>
          <CardDescription>Évolution sur les 7 derniers jours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end justify-around gap-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day, i) => {
              const percentage = dailyPercentages[i] || 60;
              return (
                <div
                  key={day}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className="w-full rounded-t-md bg-gradient-primary"
                    style={{ height: `${percentage}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aller plus loin</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Accédez rapidement aux pages de gestion détaillée.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Link href="/employees" className="group">
            <div className="flex items-center justify-between rounded-lg border bg-card/80 px-3 py-2 text-sm shadow-sm transition-colors group-hover:bg-accent/60">
              <div>
                <p className="font-medium">Gérer les employés</p>
                <p className="text-xs text-muted-foreground">Voir les employés et leurs informations</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/pointages" className="group">
            <div className="flex items-center justify-between rounded-lg border bg-card/80 px-3 py-2 text-sm shadow-sm transition-colors group-hover:bg-accent/60">
              <div>
                <p className="font-medium">Pointages</p>
                <p className="text-xs text-muted-foreground">Analyser les présences de l&apos;équipe</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/reports" className="group">
            <div className="flex items-center justify-between rounded-lg border bg-card/80 px-3 py-2 text-sm shadow-sm transition-colors group-hover:bg-accent/60">
              <div>
                <p className="font-medium">Rapports</p>
                <p className="text-xs text-muted-foreground">Consulter les rapports détaillés</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
