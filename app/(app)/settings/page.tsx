import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from '@/lib/session';
import { adminGetSystemSettings } from '@/actions/admin/settings';
import AdminSettingsClient from '@/features/admin/settings';

export default async function AppSettingsPage() {
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

  const settings = await adminGetSystemSettings();

  return <AdminSettingsClient initialSettings={settings} />;
}
