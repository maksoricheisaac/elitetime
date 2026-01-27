import { redirect } from 'next/navigation';
import { adminGetActivityLogsWithEmployees } from '@/actions/admin/logs';
import LogsClient from '@/features/admin/logs';
import { requireNavigationAccessById } from '@/lib/navigation-guard';

function toISODate(date: Date): string {
  // Formatte la date en AAAA-MM-JJ en utilisant le fuseau local (sans passer par l'UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function AppLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>;
}) {
  try {
    await requireNavigationAccessById('logs');
  } catch {
    redirect('/dashboard');
  }
  const fromParam = (await searchParams)?.from;
  const toParam = (await searchParams)?.to;

  let from = fromParam;
  let to = toParam;

  if (!from || !to) {
    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 30);
    from = toISODate(defaultFrom);
    to = toISODate(today);
  }

  const { logs, employees } = await adminGetActivityLogsWithEmployees({
    limit: 200,
    from,
    to,
  });

  return <LogsClient logs={logs} employees={employees} />;
}
