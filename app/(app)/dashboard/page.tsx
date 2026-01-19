import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { managerGetDashboardStats } from "@/actions/manager/dashboard";
import { getAdminDashboardStats } from "@/actions/admin/dashboard";
import { getSystemSettings } from "@/actions/admin/settings";
import { getEmployeeTodayPointage, getEmployeeWeekStats } from "@/actions/employee/pointages";
import { getEmployeeTodayBreaks } from "@/actions/employee/breaks";
import EmployeeDashboardClient from "@/features/employee/dashboard";
import ManagerDashboardClient from "@/features/manager/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Shield, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PresenceChart } from "@/components/charts/presence-chart";
import { RetardChart } from "@/components/charts/retard-chart";
import { requireNavigationAccessById } from "@/lib/navigation-guard";

export default async function AppDashboardPage() {
  const auth = await requireNavigationAccessById('dashboard');
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
  });

  if (!user) {
    redirect('/login');
  }

  if (user.role === "employee") {
    const [todayPointage, weekStats, systemSettings, todayBreaks] = await Promise.all([
      getEmployeeTodayPointage(user.id),
      getEmployeeWeekStats(user.id),
      getSystemSettings(),
      getEmployeeTodayBreaks(user.id),
    ]);

    return (
      <EmployeeDashboardClient
        user={user}
        todayPointage={todayPointage}
        weekStats={weekStats}
        workStartTime={systemSettings.workStartTime}
        workEndTime={systemSettings.workEndTime}
        initialBreaks={todayBreaks}
      />
    );
  }

  if (user.role === "manager") {
    const stats = await managerGetDashboardStats(user.id);
    return <ManagerDashboardClient team={stats.team} todayPointages={stats.todayPointages} />;
  }

  if (user.role === "admin") {
    const stats = await getAdminDashboardStats();

    const totalUsers = stats.totalUsers;
    const employees = stats.employees;
    const managers = stats.managers;
    const admins = stats.admins;
    const activeToday = stats.activeToday;
    const monthData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));

      const presents = Math.max(0, Math.min(employees, employees - 2 + ((i % 5) - 2)));
      const absents = Math.max(0, 3 - ((i % 5) - 2));

      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        presents,
        absents,
        total: presents + absents,
      };
    });

    const retardData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      
      const retards = (i * 3) % 8;
      const moyenneRetard = 5 + ((i * 7) % 15);

      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        retards,
        moyenneRetard,
      };
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble de l&apos;entreprise</p>
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
              <p className="text-xs text-muted-foreground">Responsables d&apos;équipe</p>
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
          <PresenceChart 
            data={monthData} 
            title="Présences du mois" 
            description="Nombre d'employés présents et absents par jour" 
          />
          <RetardChart 
            data={retardData} 
            title="Retards du mois" 
            description="Nombre de retards et temps moyen d'arrivée par jour" 
          />
        </div>

        {/* Répartition par service */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {stats.departments.map((dept) => {
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

  redirect('/dashboard');
}
