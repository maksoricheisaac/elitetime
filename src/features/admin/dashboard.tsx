"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Shield, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PresenceChart } from "@/components/charts/presence-chart";
import { RetardChart } from "@/components/charts/retard-chart";
import { adminGetDashboardChartData } from "@/actions/admin/dashboard";
import { EmployeeReportDateRangeFilter } from "@/features/manager/employee-report-date-range-filter";

interface DepartmentStat {
  name: string;
  count: number;
}

interface AdminDashboardStats {
  totalUsers: number;
  employees: number;
  managers: number;
  admins: number;
  activeToday: number;
  departments: DepartmentStat[];
}

interface AdminDashboardClientProps {
  stats: AdminDashboardStats;
}

type AdminChartData = Awaited<ReturnType<typeof adminGetDashboardChartData>>;

function fromISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AdminDashboardClient({ stats }: AdminDashboardClientProps) {
  const { totalUsers, employees, managers, admins, activeToday, departments } = stats;
  const searchParams = useSearchParams();

  const { from, to, periodLabel } = useMemo(() => {
    const fromParam = searchParams?.get("from") ?? undefined;
    const toParam = searchParams?.get("to") ?? undefined;

    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 30);
    defaultFrom.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    const fromDate = fromISODate(fromParam) ?? defaultFrom;
    const toDate = fromISODate(toParam) ?? today;

    const fromLabel = fromDate.toLocaleDateString("fr-FR");
    const toLabel = toDate.toLocaleDateString("fr-FR");

    let label = "Choisir une période";
    if (fromLabel && !toLabel) {
      label = fromLabel;
    } else if (!fromLabel && toLabel) {
      label = toLabel;
    } else if (fromLabel && toLabel && fromLabel === toLabel) {
      label = fromLabel;
    } else if (fromLabel && toLabel) {
      label = `${fromLabel} – ${toLabel}`;
    }

    return { from: fromDate, to: toDate, periodLabel: label };
  }, [searchParams]);

  const [chartData, setChartData] = useState<AdminChartData | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsChartLoading(true);
      try {
        const data = await adminGetDashboardChartData(
          from.toISOString(),
          to.toISOString(),
        );
        if (!cancelled) {
          setChartData(data);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setChartData({ presence: [], retards: [] });
        }
      } finally {
        if (!cancelled) {
          setIsChartLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
        <p className="text-muted-foreground">Vue d&apos;ensemble de l&apos;entreprise</p>
      </div>

      <div className="flex justify-end mb-2">
        <div className="w-full max-w-xs">
          <EmployeeReportDateRangeFilter />
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {employees} employés, {managers} managers, {admins} admins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employés</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees}</div>
            <p className="text-xs text-muted-foreground">Utilisateurs actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers}</div>
            <p className="text-xs text-muted-foreground">Responsables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs maintenant</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeToday}</div>
            <p className="text-xs text-muted-foreground">En train de travailler</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        {isChartLoading && (
          <div className="col-span-2 text-xs text-muted-foreground">Chargement des données...</div>
        )}
        <PresenceChart
          data={chartData?.presence ?? []}
          title="Présences du mois"
          description={`Nombre d'employés présents et absents par jour sur les ${periodLabel.toLowerCase()}`}
        />
        <RetardChart
          data={chartData?.retards ?? []}
          title="Retards du mois"
          description={`Nombre de retards par jour sur les ${periodLabel.toLowerCase()}`}
        />
      </div>

      {/* Répartition par service */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {departments.map((dept) => {
              const count = dept.count;
              const percent = employees > 0 ? (count / employees) * 100 : 0;
              return (
                <div key={dept.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dept.name}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-gradient-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
