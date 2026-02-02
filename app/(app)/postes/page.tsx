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
