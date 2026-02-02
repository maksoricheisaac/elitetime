import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireNavigationAccessById } from '@/lib/navigation-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DepartmentsTable, type DepartmentWithEmployeeCount } from '@/features/admin/departments-table';
import { DepartmentsStatsCards } from '@/features/admin/departments-stats-cards';
import { DepartmentsSearchForm } from '@/features/admin/departments-search-form';
import { DepartmentsCreateDialog } from '@/features/admin/departments-create-dialog';
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/actions/admin/departments';


export default async function AppDepartmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  try {
    await requireNavigationAccessById('departements');
  } catch {
    redirect('/dashboard');
  }

  const search = ((await searchParams)?.q || '').trim().toLowerCase();

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  const employeesByDepartment = await prisma.user.groupBy({
    by: ['department'],
    where: {
      role: 'employee',
    },
    _count: {
      _all: true,
    },
  });

  const allEmployees = await prisma.user.findMany({
    where: { role: 'employee' },
    select: { status: true },
  });

  const totalEmployees = allEmployees.length;
  const activeEmployees = allEmployees.filter(e => e.status === 'active').length;
  const inactiveEmployees = allEmployees.filter(e => e.status === 'inactive').length;

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

      <DepartmentsStatsCards
        departments={departments}
        employeesByDepartment={employeesByDepartment}
        totalEmployees={totalEmployees}
        activeEmployees={activeEmployees}
        inactiveEmployees={inactiveEmployees}
      />

      <Card className="border border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Liste des départements</CardTitle>
            <CardDescription>
              Vue d&apos;ensemble des départements et du nombre d&apos;employés associés
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="w-full md:w-64">
              <DepartmentsSearchForm initialQuery={(await searchParams)?.q || ''} />
            </div>
            <DepartmentsCreateDialog action={createDepartment} />
          </div>
        </CardHeader>
        <CardContent>
          <DepartmentsTable
            data={filteredDepartments}
            onUpdateDepartment={updateDepartment}
            onDeleteDepartment={deleteDepartment}
          />
        </CardContent>
      </Card>
    </div>
  );
}
