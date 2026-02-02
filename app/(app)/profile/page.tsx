import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Briefcase, Building } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sanitizeUser } from '@/lib/session';
import ProfileUpdateNotifier from '@/features/employee/profile-update-notifier';
import { requireNavigationAccessByPath } from '@/lib/navigation-guard';

export default async function AppEmployeeProfile() {
  try {
    await requireNavigationAccessByPath('/profile');
  } catch {
    redirect('/dashboard');
  }

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

  return (
    <div className="space-y-6">
      <ProfileUpdateNotifier />
      <div>
        <h1 className="text-3xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground">Consultez vos informations personnelles (lecture seule)</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Vos informations sont gérées par l&apos;administrateur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Prénom</p>
                <p className="text-sm font-medium">{user.firstname || 'Non renseigné'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Nom</p>
                <p className="text-sm font-medium">{user.lastname || 'Non renseigné'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations professionnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user.email  || 'Non renseigné'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Poste</p>
              <p className="text-sm text-muted-foreground">{user.position || 'Non renseigné'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Service</p>
              <p className="text-sm text-muted-foreground">{user.department || 'Non renseigné'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Rôle</p>
              <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
