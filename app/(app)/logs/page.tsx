import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from '@/lib/session';
import { adminGetActivityLogs } from '@/actions/admin/logs';
import LogsClient from '@/features/admin/logs';

export default async function AppLogsPage() {
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

  if (user.role !== 'admin') {
    redirect(getDashboardPath(user.role));
  }

  const logs = await adminGetActivityLogs({ limit: 200 });

  return <LogsClient logs={logs} />;
}
