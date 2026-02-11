import { redirect } from 'next/navigation';
import { adminGetSystemSettings } from '@/actions/admin/settings';
import { adminGetEmailScheduling } from '@/actions/admin/email-scheduling';
import AdminSettingsClient from '@/features/admin/settings';
import { requireNavigationAccessById } from '@/lib/navigation-guard';

export default async function AppSettingsPage() {
  try {
    await requireNavigationAccessById('settings');
  } catch {
    redirect('/dashboard');
  }

  const settings = await adminGetSystemSettings();
  const emailScheduling = await adminGetEmailScheduling();

  return <AdminSettingsClient initialSettings={settings} emailScheduling={emailScheduling} />;
}
