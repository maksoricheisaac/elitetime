import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { managerGetReportsData } from '@/actions/manager/reports';
import ManagerReportsClient from '@/features/manager/reports';
import { requireNavigationAccessById } from '@/lib/navigation-guard';
import { getUserPermissions } from '@/lib/security/rbac';
import { Prisma } from '@/generated/prisma/client';

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

export default async function AppReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>;
}) {
  try {
    const auth = await requireNavigationAccessById('reports');
    const user = auth.user;

    if (user.role === 'manager') {
      const data = await managerGetReportsData(user.id);
      return (
        <ManagerReportsClient
          team={data.team}
          pointages={data.pointages}
          breaks={data.breaks}
          overtimeThreshold={data.overtimeThreshold}
        />
      );
    }

    if (user.role === 'employee') {
      // Employé avec permission view_reports : rapports limités à son département
      const permissions = await getUserPermissions(user.id);
      const permissionSet = new Set(permissions.map((p) => p.name));

      if (!permissionSet.has('view_reports')) {
        redirect('/dashboard');
      }

      const whereEmployees: Prisma.UserWhereInput = {
        role: 'employee',
        status: 'active',
      };

      if (user.department) {
        whereEmployees.department = user.department;
      }

      const employees = await prisma.user.findMany({
        where: whereEmployees,
        orderBy: { firstname: 'asc' },
      });

      if (employees.length === 0) {
        const settings = await prisma.systemSettings.findFirst();
        const overtimeThreshold = settings?.overtimeThreshold ?? 40;
        return (
          <ManagerReportsClient team={[]} pointages={[]} breaks={[]} overtimeThreshold={overtimeThreshold} />
        );
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
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstname: true,
              lastname: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      const breaks = await prisma.break.findMany({
        where: {
          userId: { in: teamIds },
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: { date: 'desc' },
      });

      const settings = await prisma.systemSettings.findFirst();
      const overtimeThreshold = settings?.overtimeThreshold ?? 40;

      return (
        <ManagerReportsClient
          team={employees}
          pointages={pointages}
          breaks={breaks}
          overtimeThreshold={overtimeThreshold}
        />
      );
    }

    // Admin: rapports globaux sur tous les employés
  const employees = await prisma.user.findMany({
    where: {
      role: 'employee',
      status: 'active',
    },
    orderBy: { firstname: 'asc' },
  });

  if (employees.length === 0) {
    const settings = await prisma.systemSettings.findFirst();
    const overtimeThreshold = settings?.overtimeThreshold ?? 40;
    return (
      <ManagerReportsClient team={[]} pointages={[]} breaks={[]} overtimeThreshold={overtimeThreshold} />
    );
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
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstname: true,
          lastname: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  const breaks = await prisma.break.findMany({
    where: {
      userId: { in: teamIds },
      date: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: { date: 'desc' },
  });

  const settings = await prisma.systemSettings.findFirst();
  const overtimeThreshold = settings?.overtimeThreshold ?? 40;

  return (
    <ManagerReportsClient
      team={employees}
      pointages={pointages}
      breaks={breaks}
      overtimeThreshold={overtimeThreshold}
    />
  );
  } catch (error) {
    console.error('Erreur lors de l\'accès aux rapports:', error);
    redirect('/dashboard');
  }
}
