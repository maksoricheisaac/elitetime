import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from '@/lib/session';
import { managerGetReportsData } from '@/actions/manager/reports';
import ManagerReportsClient from '@/features/manager/reports';

export default async function AppReportsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user) {
    redirect('/login');
  }

  const user = sanitizeUser(session.user);

  if (!['manager', 'admin'].includes(user.role)) {
    redirect(getDashboardPath(user.role));
  }

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
      overtimeThreshold={overtimeThreshold}
    />
  );
}
