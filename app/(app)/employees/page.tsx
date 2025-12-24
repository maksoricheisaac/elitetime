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
}

export default async function AppEmployeesPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
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

  const departmentParam = searchParams?.department;
  const selectedDepartment =
    typeof departmentParam === 'string' && departmentParam.length > 0
      ? departmentParam
      : 'all';

  const roleParam = searchParams?.role;
  const selectedRole =
    typeof roleParam === 'string' && roleParam.length > 0
      ? roleParam
      : 'all';

  const searchParam = searchParams?.search;
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

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <form className="flex flex-wrap items-center gap-3" method="GET">
          <div className="space-y-1">
            <label htmlFor="search" className="text-sm text-muted-foreground">
              Recherche
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <Input
                id="search"
                name="search"
                placeholder="Nom, email, poste ou département"
                defaultValue={typeof searchParam === 'string' ? searchParam : ''}
                className="h-9 w-52 pl-9 text-sm md:w-64"
              />
            </div>
          </div>

          {departments.length > 0 && (
            <>
              <label htmlFor="department" className="text-sm text-muted-foreground">
                Département
              </label>
              <select
                id="department"
                name="department"
                defaultValue={selectedDepartment}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Tous</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label htmlFor="role" className="text-sm text-muted-foreground">
            Rôle
          </label>
          <select
            id="role"
            name="role"
            defaultValue={selectedRole}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Tous</option>
            <option value="employee">Employé</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </form>
      </div>

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
              <TableHeader className="bg-muted/60">
                <TableRow>
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
                            <form action={updateEmployee} className="space-y-4">
                              <input type="hidden" name="id" value={e.id} />
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
                              <div className="space-y-2">
                                <Label htmlFor={`email-${e.id}`}>Email</Label>
                                <Input
                                  id={`email-${e.id}`}
                                  name="email"
                                  type="email"
                                  defaultValue={e.email ?? ''}
                                />
                              </div>
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
  );
}
