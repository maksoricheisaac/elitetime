import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireNavigationAccessById } from '@/lib/navigation-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Settings, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { PermissionsManager } from '@/components/admin/permissions-manager';

async function getAdminUsers() {
  try {
    await requireNavigationAccessById('permissions');
  } catch {
    redirect('/dashboard');
  }

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    orderBy: { username: 'asc' },
  });

  // Récupérer les permissions pour chaque utilisateur séparément
  const usersWithPermissions = await Promise.all(
    users.map(async (user) => {
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: user.id },
        include: { permission: true },
      });
      return {
        ...user,
        userPermissions,
      };
    })
  );

  const permissions = await prisma.permission.findMany({
    orderBy: { category: 'asc' },
  });

  return { users: usersWithPermissions, permissions };
}

export default async function PermissionsPage() {
  const { users, permissions } = await getAdminUsers();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Shield className="h-3 w-3" />
            Permissions
          </div>
          <Button variant="outline" size="sm" asChild className='cursor-pointer'>
            <Link href="/permissions-guide">
              <HelpCircle className="h-4 w-4 mr-2" />
              Guide
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion des permissions</h1>
        <p className="text-sm text-muted-foreground">
          Attribuez des permissions spécifiques aux utilisateurs pour un contrôle granulaire de l&apos;accès.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions disponibles</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(permissions.map(p => p.category)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <PermissionsManager users={users} permissions={permissions} />
    </div>
  );
}
