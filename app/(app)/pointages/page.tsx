import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getEmployeeRecentPointages } from "@/actions/employee/pointages";
import EmployeePointagesClient from "@/features/employee/pointages";
import ManagerPointagesClient from "@/features/manager/pointages";
import { requireNavigationAccessById } from "@/lib/navigation-guard";
import { getUserPermissions } from "@/lib/security/rbac";

function resolveRange(searchParams?: { from?: string; to?: string }) {
  const fromParam = searchParams?.from;
  const toParam = searchParams?.to;

  const today = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(today.getDate() - 30);
  defaultFrom.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : today;

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
}

export default async function AppPointagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>;
}) {
  const auth = await requireNavigationAccessById("pointages");
  const user = auth.user;

  // Employé : par défaut ne voit que ses propres pointages, sauf s'il a la permission view_team_pointages
  if (user.role === "employee") {
    const permissions = await getUserPermissions(user.id);
    const permissionSet = new Set(permissions.map((p) => p.name));
    const canViewTeamPointages = permissionSet.has("view_team_pointages");

    if (!canViewTeamPointages) {
      const pointages = await getEmployeeRecentPointages(user.id, 30);
      return <EmployeePointagesClient pointages={pointages} canEdit={false} />;
    }

    // Employé avec accès équipe : on limite l'équipe à son département
    const employeeWhere: Prisma.UserWhereInput = {
      role: "employee",
      status: "active",
    };

    if (user.department) {
      employeeWhere.department = user.department;
    }

    const employees = await prisma.user.findMany({
      where: employeeWhere,
      orderBy: { firstname: "asc" },
    });

    if (employees.length === 0) {
      return <ManagerPointagesClient team={[]} pointages={[]} absences={[]} breaks={[]} />;
    }

    const teamIds = employees.map((u) => u.id);

    const { fromDate, toDate } = resolveRange(await searchParams);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: { in: teamIds },
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { date: "desc" },
    });

    const breaks = await prisma.break.findMany({
      where: {
        userId: { in: teamIds },
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { date: "desc" },
    });

    const absences = await prisma.absence.findMany({
      where: {
        userId: { in: teamIds },
      },
      orderBy: { startDate: "desc" },
    });

    return (
      <ManagerPointagesClient
        team={employees}
        pointages={pointages}
        absences={absences}
        breaks={breaks}
      />
    );
  }

  // Managers & admins : même périmètre (tous les collaborateurs actifs qui pointent)
  if (!["manager", "admin"].includes(user.role)) {
    redirect("/dashboard");
  }

  const employees = await prisma.user.findMany({
    where: {
      role: { in: ["employee", "team_lead"] },
      status: "active",
    },
    orderBy: { firstname: "asc" },
  });

  let data;

  if (employees.length === 0) {
    data = { team: [], pointages: [], absences: [], breaks: [] };
  } else {
    const teamIds = employees.map((u) => u.id);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: { in: teamIds },
        date: {
          gte: since,
        },
      },
      orderBy: { date: "desc" },
    });

    const absences = await prisma.absence.findMany({
      where: {
        userId: { in: teamIds },
      },
      orderBy: { startDate: "desc" },
    });

    const breaks = await prisma.break.findMany({
      where: {
        userId: { in: teamIds },
        date: {
          gte: since,
        },
      },
      orderBy: { date: "desc" },
    });

    data = { team: employees, pointages, absences, breaks };
  }

  return (
    <ManagerPointagesClient
      team={data.team}
      pointages={data.pointages}
      absences={data.absences}
      breaks={data.breaks}
    />
  );
}
