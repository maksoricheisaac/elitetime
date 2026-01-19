import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { adminGetSystemSettings } from '@/actions/admin/settings';
import AdminSettingsClient from '@/features/admin/settings';
import { requireNavigationAccessById } from '@/lib/navigation-guard';

export default async function AppSettingsPage() {
  try {
    await requireNavigationAccessById('settings');
  } catch {
    redirect('/dashboard');
  }

  const settings = await adminGetSystemSettings();

  return <AdminSettingsClient initialSettings={settings} />;
}
