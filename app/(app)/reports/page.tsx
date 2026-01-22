import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { managerGetReportsData } from '@/actions/manager/reports';
import ManagerReportsClient from '@/features/manager/reports';
import { requireNavigationAccessById } from '@/lib/navigation-guard';
import { getUserPermissions } from '@/lib/security/rbac';
import { Prisma } from '@/generated/prisma/client';

export default async function AppReportsPage() {
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

      const since = new Date();
      since.setDate(since.getDate() - 90);

      const pointages = await prisma.pointage.findMany({
        where: {
          userId: { in: teamIds },
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
            gte: since,
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

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId: { in: teamIds },
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
        gte: since,
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
