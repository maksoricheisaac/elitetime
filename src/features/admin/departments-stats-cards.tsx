import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Department } from "@/generated/prisma/client";
import { Building, Users, UserCheck, TrendingUp } from "lucide-react";

interface DepartmentsStatsCardsProps {
  departments: Department[];
  employeesByDepartment: { department: string | null; _count: { _all: number } }[];
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
}

export function DepartmentsStatsCards({
  departments,
  employeesByDepartment,
  totalEmployees,
  activeEmployees,
  inactiveEmployees,
}: DepartmentsStatsCardsProps) {
  const departmentsWithEmployees = departments.filter((dept) =>
    employeesByDepartment.some((g) => g.department === dept.name && g._count._all > 0)
  ).length;

  const departmentsWithoutEmployees = departments.length - departmentsWithEmployees;

  const topDepartment = employeesByDepartment
    .filter((g) => g.department && g._count._all > 0)
    .sort((a, b) => b._count._all - a._count._all)[0];

  const avgEmployeesPerDepartment =
    departments.length > 0 ? Math.round((totalEmployees / departments.length) * 10) / 10 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total départements */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total départements</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{departments.length}</div>
          <p className="text-xs text-muted-foreground">
            {departmentsWithEmployees} avec employés • {departmentsWithoutEmployees} vides
          </p>
        </CardContent>
      </Card>

      {/* Total employés */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total employés</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            Moy. {avgEmployeesPerDepartment} / département
          </p>
        </CardContent>
      </Card>

      {/* Employés actifs */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Employés actifs</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{activeEmployees}</div>
          <p className="text-xs text-muted-foreground">
            {inactiveEmployees > 0 && (
              <span className="text-destructive">{inactiveEmployees} inactifs</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Top département */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top département</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {topDepartment ? (
            <div className="space-y-1">
              <div className="font-medium text-sm truncate">{topDepartment.department}</div>
              <div className="text-lg font-bold">{topDepartment._count._all} employés</div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun département avec employés</p>
          )}
        </CardContent>
      </Card>

      {/* Répartition */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Répartition</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs">Avec employés</span>
            <Badge variant="default" className="text-xs">
              {departmentsWithEmployees}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Vides</span>
            <Badge variant="secondary" className="text-xs">
              {departmentsWithoutEmployees}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
