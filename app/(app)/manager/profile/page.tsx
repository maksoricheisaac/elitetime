import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Mail, Briefcase, Building, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sanitizeUser } from '@/lib/session';
import { updateEmployeeProfileAction } from '@/actions/employee/profile';
import { requireNavigationAccessByPath } from '@/lib/navigation-guard';

export default async function AppManagerProfile() {
  try {
    await requireNavigationAccessByPath('/manager/profile');
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

  // Récupérer les informations de l'équipe du manager
  const team = await prisma.user.findMany({
    where: {
      role: 'employee',
      status: 'active',
    },
    orderBy: { firstname: 'asc' },
    take: 5, // Limiter à 5 pour l'aperçu
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles et votre équipe</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 text-6xl">
              <AvatarFallback className="bg-primary text-white">
                {user.avatar}
              </AvatarFallback>
            </Avatar>
            <p className="text-center text-sm text-muted-foreground">
              Votre avatar est généré automatiquement
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Modifiez vos informations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateEmployeeProfileAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname">Prénom</Label>
                  <Input
                    id="firstname"
                    name="firstname"
                    defaultValue={user.firstname ?? ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">Nom</Label>
                  <Input
                    id="lastname"
                    name="lastname"
                    defaultValue={user.lastname ?? ''}
                  />
                </div>
              </div>
              <Button type="submit">Enregistrer les modifications</Button>
            </form>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vue d'ensemble de l'équipe
          </CardTitle>
          <CardDescription>
            Les {team.length} premiers membres de votre équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun employé dans votre équipe</p>
          ) : (
            <div className="space-y-2">
              {team.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">
                      {employee.firstname} {employee.lastname}
                    </p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{employee.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
