import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import type { User } from '@/generated/prisma/client';
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from '@/lib/session';
import { managerGetTeamData } from '@/actions/manager/team';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeesFilters } from '@/features/admin/employees-filters';
import { EmployeesUpdateNotifier } from '@/features/admin/employees-update-notifier';

async function updateEmployee(formData: FormData) {
  'use server';

  const id = (formData.get('id') as string | null)?.trim();
  const firstname = (formData.get('firstname') as string | null)?.trim() || null;
  const lastname = (formData.get('lastname') as string | null)?.trim() || null;
  const email = (formData.get('email') as string | null)?.trim() || null;

  const rawDepartment = (formData.get('department') as string | null)?.trim();
  const department = !rawDepartment || rawDepartment === '__none' ? null : rawDepartment;

  const rawPosition = (formData.get('position') as string | null)?.trim();
  const position = !rawPosition || rawPosition === '__none' ? null : rawPosition;
  const role = (formData.get('role') as string | null)?.trim() || 'employee';
  const status = (formData.get('status') as string | null)?.trim() || 'active';

  if (!id) {
    return;
  }

  await prisma.user.update({
    where: { id },
    data: {
      firstname,
      lastname,
      email,
      department,
      position,
      role: role as 'employee' | 'manager' | 'admin',
      status: status as 'active' | 'inactive',
    },
  });

  revalidatePath('/employees');
  redirect('/employees?updated=1');
}

export default async function AppEmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  let employees: User[] = [];

  if (user.role === 'manager') {
    const data = await managerGetTeamData(user.id);
    employees = data.team;
  } else {
    employees = await prisma.user.findMany({
      orderBy: { firstname: 'asc' },
    });
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  const positions = await prisma.position.findMany({
    include: { department: true },
    orderBy: { name: 'asc' },
  });

  const departmentParam = (await searchParams)?.department;
  const selectedDepartment =
    typeof departmentParam === 'string' && departmentParam.length > 0
      ? departmentParam
      : 'all';

  const roleParam = (await searchParams)?.role;
  const selectedRole =
    typeof roleParam === 'string' && roleParam.length > 0
      ? roleParam
      : 'all';

  const searchParam = (await searchParams)?.search;
  const searchTerm =
    typeof searchParam === 'string' && searchParam.trim().length > 0
      ? searchParam.trim().toLowerCase()
      : '';

  const filteredEmployees = employees.filter((e) => {
    const matchDept = selectedDepartment === 'all' || e.department === selectedDepartment;
    const matchRole = selectedRole === 'all' || e.role === selectedRole;

    const fullName = `${e.firstname || ''} ${e.lastname || ''}`.toLowerCase();
    const email = (e.email || '').toLowerCase();
    const department = (e.department || '').toLowerCase();
    const position = (e.position || '').toLowerCase();
    const matchSearch =
      !searchTerm ||
      fullName.includes(searchTerm) ||
      email.includes(searchTerm) ||
      department.includes(searchTerm) ||
      position.includes(searchTerm);

    return matchDept && matchRole && matchSearch;
  });

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Employés
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des employés</h1>
          <p className="text-sm text-muted-foreground">
            Recherchez et filtrez les employés par service, rôle et informations de contact.
          </p>
        </div>
        <EmployeesUpdateNotifier />

        <EmployeesFilters
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />

        <Card className="border border-border/80 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Liste des employés ({filteredEmployees.length})</CardTitle>
            <CardDescription>
              Vue d&apos;ensemble des employés. L&apos;édition détaillée est réservée aux administrateurs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[900px] w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="px-3 py-2 text-left">Nom</TableHead>
                    <TableHead className="px-3 py-2 text-left">Email</TableHead>
                    <TableHead className="px-3 py-2 text-left">Rôle</TableHead>
                    <TableHead className="px-3 py-2 text-left">Département</TableHead>
                    <TableHead className="px-3 py-2 text-left">Poste</TableHead>
                    <TableHead className="px-3 py-2 text-left">Statut</TableHead>
                    <TableHead className="px-3 py-2 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((e) => (
                    <TableRow
                      key={e.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="px-3 py-2 font-medium">
                        {e.firstname} {e.lastname}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs">{e.email || '-'}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">
                          {e.role === 'employee' ? 'Employé' : e.role === 'manager' ? 'Manager' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2">{e.department || '-'}</TableCell>
                      <TableCell className="px-3 py-2">{e.position || '-'}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge variant={e.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {e.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        {user.role === 'admin' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="sm">
                                Modifier
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Modifier l&apos;employé</DialogTitle>
                                <DialogDescription>
                                  Mettez à jour les informations de l&apos;employé.
                                </DialogDescription>
                              </DialogHeader>
                              <form action={updateEmployee} className="space-y-6">
                                <input type="hidden" name="id" value={e.id} />

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor={`firstname-${e.id}`}>Prénom</Label>
                                    <Input
                                      id={`firstname-${e.id}`}
                                      name="firstname"
                                      defaultValue={e.firstname ?? ''}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`lastname-${e.id}`}>Nom</Label>
                                    <Input
                                      id={`lastname-${e.id}`}
                                      name="lastname"
                                      defaultValue={e.lastname ?? ''}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`email-${e.id}`}>Email</Label>
                                  <Input
                                    id={`email-${e.id}`}
                                    name="email"
                                    type="email"
                                    defaultValue={e.email ?? ''}
                                  />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor={`role-${e.id}`}>Rôle</Label>
                                    <Select defaultValue={e.role} name="role">
                                      <SelectTrigger id={`role-${e.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="employee">Employé</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`status-${e.id}`}>Statut</Label>
                                    <Select defaultValue={e.status} name="status">
                                      <SelectTrigger id={`status-${e.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Actif</SelectItem>
                                        <SelectItem value="inactive">Inactif</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor={`department-${e.id}`}>Département</Label>
                                    <Select defaultValue={e.department ?? ''} name="department">
                                      <SelectTrigger id={`department-${e.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none">Aucun</SelectItem>
                                        {departments.map((dept) => (
                                          <SelectItem key={dept.id} value={dept.name}>
                                            {dept.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`position-${e.id}`}>Poste</Label>
                                    <Select defaultValue={e.position ?? ''} name="position">
                                      <SelectTrigger id={`position-${e.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none">Aucun</SelectItem>
                                        {positions.map((p) => (
                                          <SelectItem key={p.id} value={p.name}>
                                            {p.name}
                                            {p.department ? ` (${p.department.name})` : ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button type="submit">Enregistrer</Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
