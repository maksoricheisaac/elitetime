import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import type { Department } from '@/generated/prisma/client';
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from '@/lib/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

async function createDepartment(formData: FormData) {
  'use server';

  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const description = (formData.get('description') as string | null)?.trim() || null;

  if (!name) {
    return;
  }

  await prisma.department.create({
    data: {
      name,
      description,
    },
  });
  revalidatePath('/departements');
}

async function updateDepartment(formData: FormData) {
  'use server';

  const id = (formData.get('id') as string | null)?.trim();
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const description = (formData.get('description') as string | null)?.trim() || null;

  if (!id || !name) {
    return;
  }

  const existing = await prisma.department.findUnique({
    where: { id },
  });

  if (!existing) {
    return;
  }

  await prisma.$transaction([
    prisma.department.update({
      where: { id },
      data: {
        name,
        description,
      },
    }),
    prisma.user.updateMany({
      where: {
        role: 'employee',
        department: existing.name,
      },
      data: {
        department: name,
      },
    }),
  ]);

  revalidatePath('/departements');
}

async function deleteDepartment(formData: FormData) {
  'use server';

  const id = (formData.get('id') as string | null)?.trim();
  if (!id) {
    return;
  }

  const department = await prisma.department.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!department) {
    return;
  }

  const employeesUsingDepartment = await prisma.user.count({
    where: {
      role: 'employee',
      status: 'active',
      department: department.name,
    },
  });

  if (employeesUsingDepartment > 0) {
    return;
  }

  await prisma.department.delete({ where: { id } });
  revalidatePath('/departements');
}

export default async function AppDepartmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
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

  const search = ((await searchParams)?.q || '').trim().toLowerCase();

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  const employeesByDepartment = await prisma.user.groupBy({
    by: ['department'],
    where: {
      role: 'employee',
      status: 'active',
    },
    _count: {
      _all: true,
    },
  });

  type DepartmentWithEmployeeCount = Department & { employeesCount: number };

  const departmentsWithCounts: DepartmentWithEmployeeCount[] = departments.map((department) => {
    const match = employeesByDepartment.find((g) => g.department === department.name);
    return {
      ...department,
      employeesCount: match?._count._all ?? 0,
    };
  });

  const filteredDepartments = departmentsWithCounts.filter((department) => {
    if (!search) return true;
    const nameMatch = department.name.toLowerCase().includes(search);
    const descMatch = (department.description || '').toLowerCase().includes(search);
    return nameMatch || descMatch;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Départements
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Départements</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les départements et visualisez le nombre d&apos;employés associés
        </p>
      </div>
      <Card className="border border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Liste des départements</CardTitle>
            <CardDescription>
              Vue d&apos;ensemble des départements et du nombre d&apos;employés associés
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <form className="w-full md:w-64" action="/departements" method="get">
              <Input
                type="text"
                name="q"
                placeholder="Rechercher un département..."
                defaultValue={(await searchParams)?.q || ''}
                className="h-9 text-sm"
              />
            </form>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" className="cursor-pointer">
                  Nouveau département
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau département</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau département disponible pour votre équipe.
                  </DialogDescription>
                </DialogHeader>
                <form action={createDepartment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-department-name">Nom du département</Label>
                    <Input
                      id="new-department-name"
                      name="name"
                      placeholder="Ex: Informatique, Ressources humaines..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-department-description">Description du département</Label>
                    <Input
                      id="new-department-description"
                      name="description"
                      placeholder="Description courte du département (optionnel)"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="submit">Créer</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[640px] text-sm">
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[220px]">Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[140px] text-center">Employés</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      Aucun département ne correspond à votre recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                filteredDepartments.map((department) => {
                  const count = department.employeesCount;
                  const employeesLabel =
                    count === 0
                      ? '0 employé'
                      : count === 1
                      ? '1 employé'
                      : `${count} employés`;

                  const employeesClassName =
                    count === 0
                      ? 'text-xs text-muted-foreground'
                      : 'inline-flex items-center rounded-full bg-primary/5 px-2 py-1 text-xs font-medium text-primary';

                  return (
                    <TableRow
                      key={department.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {department.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={employeesClassName}>{employeesLabel}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="sm">
                                Modifier
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier le département</DialogTitle>
                                <DialogDescription>
                                  Renommez le département et mettez à jour les employés associés.
                                </DialogDescription>
                              </DialogHeader>
                              <form action={updateDepartment} className="space-y-4">
                                <input type="hidden" name="id" value={department.id} />
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-name-${department.id}`}>
                                    Nom du département
                                  </Label>
                                  <Input
                                    id={`edit-name-${department.id}`}
                                    name="name"
                                    defaultValue={department.name}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-description-${department.id}`}>
                                    Description du département
                                  </Label>
                                  <Input
                                    id={`edit-description-${department.id}`}
                                    name="description"
                                    defaultValue={department.description ?? ''}
                                    placeholder="Description courte du département (optionnel)"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button type="submit">Enregistrer</Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={count > 0}
                              >
                                Supprimer
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Supprimer le département</DialogTitle>
                                <DialogDescription>
                                  Cette action est irréversible. Êtes-vous sûr de vouloir supprimer ce
                                  département&nbsp;?
                                </DialogDescription>
                              </DialogHeader>
                              <form action={deleteDepartment} className="flex justify-end gap-2">
                                <input type="hidden" name="id" value={department.id} />
                                <Button type="submit" variant="destructive">
                                  Confirmer
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
