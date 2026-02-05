import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireNavigationAccessById } from '@/lib/navigation-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PositionsFilter } from '@/components/customs/positions-filter';
import { PositionsTable } from '@/features/admin/positions-table';
import { PositionsCreateDialog } from '@/features/admin/positions-create-dialog';
import type { PositionWithDepartment } from '@/features/admin/positions-table';
import {
  createPositionFromForm,
  updatePositionFromForm,
  deletePositionFromForm,
} from '@/actions/admin/positions';
import { Briefcase, Building2, Layers } from 'lucide-react';

export default async function AppPositionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  try {
    await requireNavigationAccessById('postes');
  } catch {
    redirect('/dashboard');
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

  const filteredPositions: PositionWithDepartment[] =
    selectedDepartment === 'all'
      ? (positions as PositionWithDepartment[])
      : (positions as PositionWithDepartment[]).filter((p) => p.departmentId === selectedDepartment);

  const totalPositions = positions.length;
  const positionsByDepartment = new Map<string, number>();
  (positions as PositionWithDepartment[]).forEach((p) => {
    const deptName = p.department?.name ?? 'Non assigné';
    positionsByDepartment.set(deptName, (positionsByDepartment.get(deptName) ?? 0) + 1);
  });

  const departmentsWithoutPositions = departments.filter(
    (d) => !positionsByDepartment.has(d.name) || (positionsByDepartment.get(d.name) ?? 0) === 0,
  ).length;

  const topDepartments = Array.from(positionsByDepartment.entries())
    .filter(([name]) => name !== 'Non assigné')
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Postes
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion des postes</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les postes disponibles par département.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total postes</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              {departments.length} départements
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top départements</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topDepartments.length > 0 ? (
              <div className="space-y-1">
                {topDepartments.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="truncate">{name}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun poste défini</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Départements sans poste</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentsWithoutPositions}</div>
            <p className="text-xs text-muted-foreground">sans poste associé</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Postes non assignés</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positionsByDepartment.get('Non assigné') ?? 0}</div>
            <p className="text-xs text-muted-foreground">sans département</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Liste des postes ({filteredPositions.length})</CardTitle>
            <CardDescription>
              Gérez les postes disponibles dans chaque département.
            </CardDescription>
          </div>
          <PositionsCreateDialog
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            action={createPositionFromForm}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {departments.length > 1 && (
            <PositionsFilter
              departments={departments.map((d) => ({ id: d.id, name: d.name }))}
              selectedDepartment={selectedDepartment}
            />
          )}
          <PositionsTable
            data={filteredPositions}
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            onUpdatePosition={updatePositionFromForm}
            onDeletePosition={deletePositionFromForm}
          />
        </CardContent>
      </Card>
    </div>
  );
}
