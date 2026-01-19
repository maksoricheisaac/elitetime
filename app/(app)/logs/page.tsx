import { redirect } from 'next/navigation';
import { adminGetActivityLogs } from '@/actions/admin/logs';
import LogsClient from '@/features/admin/logs';
import { requireNavigationAccessById } from '@/lib/navigation-guard';

export default async function AppLogsPage() {
  try {
    await requireNavigationAccessById('logs');
  } catch {
    redirect('/dashboard');
  }

  const logs = await adminGetActivityLogs({ limit: 200 });

  return <LogsClient logs={logs} />;
}
