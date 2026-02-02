import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAdminDashboardStats } from "@/actions/admin/dashboard";
import { getSystemSettings } from "@/actions/admin/settings";
import { getEmployeeTodayPointage, getEmployeeWeekStats } from "@/actions/employee/pointages";
import { getEmployeeTodayBreaks } from "@/actions/employee/breaks";
import EmployeeDashboardClient from "@/features/employee/dashboard";
import ManagerDashboardClient from "@/features/manager/dashboard";
import AdminDashboardClient from "@/features/admin/dashboard";
import { requireNavigationAccessById } from "@/lib/navigation-guard";

export default async function AppDashboardPage() {
  const auth = await requireNavigationAccessById('dashboard');
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
  });

  if (!user) {
    redirect('/login');
  }

  if (user.role === "employee" || user.role === "team_lead") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const [todayPointage, weekStats, systemSettings, todayBreaks, todayLeave] = await Promise.all([
      getEmployeeTodayPointage(user.id),
      getEmployeeWeekStats(user.id),
      getSystemSettings(),
      getEmployeeTodayBreaks(user.id),
      prisma.absence.findFirst({
        where: {
          userId: user.id,
          type: "conge",
          status: "approved",
          startDate: {
            lte: todayEnd,
          },
          endDate: {
            gte: todayStart,
          },
        },
      }),
    ]);

    return (
      <EmployeeDashboardClient
        user={user}
        todayPointage={todayPointage}
        weekStats={weekStats}
        workStartTime={systemSettings.workStartTime}
        workEndTime={systemSettings.workEndTime}
        initialBreaks={todayBreaks}
        isOnLeaveToday={Boolean(todayLeave)}
      />
    );
  }

  if (user.role === "manager") {
    const stats = await getAdminDashboardStats();
    return <ManagerDashboardClient stats={stats} />;
  }

  if (user.role === "admin") {
    const stats = await getAdminDashboardStats();
    return <AdminDashboardClient stats={stats} />;
  }

  redirect('/login');
}
