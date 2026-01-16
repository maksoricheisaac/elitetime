"use server";

import prisma from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

export async function getAdminDashboardStats() {
  const [users, todayActivePointages, recentActivity] = await Promise.all([
    prisma.user.findMany(),
    prisma.pointage.count({
      where: {
        isActive: true,
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
      include: { user: true },
    }),
  ]);

  const totalUsers = users.length;
  const countByRole: Record<UserRole, number> = {
    admin: 0,
    manager: 0,
    employee: 0,
  };

  const departments = new Map<string, number>();
  let unassignedCount = 0;

  for (const user of users) {
    countByRole[user.role] = (countByRole[user.role] || 0) + 1;
    if (user.department) {
      departments.set(user.department, (departments.get(user.department) || 0) + 1);
    } else {
      unassignedCount++;
    }
  }

  // Ajouter les non-affectés à la liste des départements
  if (unassignedCount > 0) {
    departments.set("Non affectés", unassignedCount);
  }

  return {
    totalUsers,
    employees: countByRole.employee,
    managers: countByRole.manager,
    admins: countByRole.admin,
    activeToday: todayActivePointages,
    departments: Array.from(departments.entries()).map(([name, count]) => ({ name, count })),
    recentActivity: recentActivity,
  };
}
