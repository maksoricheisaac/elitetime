import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { managerGetReportsData } from '@/actions/manager/reports';
import ManagerReportsClient from '@/features/manager/reports';
import { requireNavigationAccessById } from '@/lib/navigation-guard';

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
        overtimeThreshold={data.overtimeThreshold}
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
      <ManagerReportsClient team={[]} pointages={[]} overtimeThreshold={overtimeThreshold} />
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

  const settings = await prisma.systemSettings.findFirst();
  const overtimeThreshold = settings?.overtimeThreshold ?? 40;

  return (
    <ManagerReportsClient
      team={employees}
      pointages={pointages}
      overtimeThreshold={overtimeThreshold}
    />
  );
  } catch (error) {
    console.error('Erreur lors de l\'accès aux rapports:', error);
    redirect('/dashboard');
  }
}
