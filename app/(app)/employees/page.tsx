import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { User } from '@/generated/prisma/client';
import { requireNavigationAccessById } from '@/lib/navigation-guard';
import { EmployeesUpdateNotifier } from '@/features/admin/employees-update-notifier';
import { EmployeesSyncNotifier } from '@/features/admin/employees-sync-notifier';
import { EmployeesStatsCards } from '@/features/admin/employees-stats-cards';
import EmployeesTable from '@/features/admin/employees-table';
import { updateEmployee, syncEmployeesFromLdap } from '@/actions/admin/employees';


export default async function AppEmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let user: User;
  try {
    const auth = await requireNavigationAccessById('employees');
    user = auth.user as User;
  } catch {
    redirect('/dashboard');
  }

  let employees: User[] = [];

  // Pour l'instant : managers et admins voient tous les employés
  employees = await prisma.user.findMany({
    orderBy: { firstname: 'asc' },
  });

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
    
        </div>
        <EmployeesUpdateNotifier />
        <EmployeesSyncNotifier />

        <EmployeesStatsCards
          employees={employees}
          departments={departments}
          positions={positions}
        />

        <EmployeesTable
          employees={filteredEmployees}
          currentUserRole={user.role}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          positions={positions}
          onUpdateEmployee={updateEmployee}
          onSyncFromLdap={syncEmployeesFromLdap}
        />
      </div>
    </>
  );
}
