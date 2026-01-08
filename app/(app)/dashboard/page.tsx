import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from "@/lib/session";
import { managerGetDashboardStats } from "@/actions/manager/dashboard";
import { getAdminDashboardStats } from "@/actions/admin/dashboard";
import { getEmployeeTodayPointage, getEmployeeWeekStats } from "@/actions/employee/pointages";
import EmployeeDashboardClient from "@/features/employee/dashboard";
import ManagerDashboardClient from "@/features/manager/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Shield, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PresenceEvolutionCard } from "@/components/charts/presence-evolution-card";

export default async function AppDashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user) {
    redirect("/login");
  }

  const user = sanitizeUser(session.user);

  if (user.role === "employee") {
    const [todayPointage, weekStats] = await Promise.all([
      getEmployeeTodayPointage(user.id),
      getEmployeeWeekStats(user.id),
    ]);

    return (
      <EmployeeDashboardClient
        user={user}
        todayPointage={todayPointage}
        weekStats={weekStats}
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

      const presence = employees - 3 + ((i % 5) - 2);
      return {
        date: date.getDate(),
        presence: Math.max(0, Math.min(employees, presence)),
      };
    });

    const recentLogs = stats.recentActivity;

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

        {/* Graphique d'évolution */}
        <PresenceEvolutionCard data={monthData} />

        {/* Répartition par service */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {['Développement', 'Commercial', 'RH', 'Comptabilité', 'Direction'].map((dept) => {
                const deptStats = stats.departments.find((d) => d.name === dept);
                const count = deptStats?.count ?? 0;
                return (
                  <div key={dept} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dept}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-gradient-primary"
                        style={{ width: `${(count / totalUsers) * 100}%` }}
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

  redirect(getDashboardPath(user.role));
}
