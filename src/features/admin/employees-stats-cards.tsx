import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { User, Department, Position } from "@/generated/prisma/client";
import { Users, UserCheck, Building, Shield } from "lucide-react";

interface EmployeesStatsCardsProps {
  employees: User[];
  departments: Department[];
  positions: Position[];
}

export function EmployeesStatsCards({
  employees,
  departments,
  positions,
}: EmployeesStatsCardsProps) {
  const realEmployees = employees.filter(e => e.role === "employee");
  const totalEmployees = realEmployees.length;
  const activeEmployees = realEmployees.filter(e => e.status === "active").length;
  const inactiveEmployees = realEmployees.filter(e => e.status === "inactive").length;

  const byRole = employees.reduce(
    (acc, e) => {
      acc[e.role] = (acc[e.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byDepartment = realEmployees.reduce(
    (acc, e) => {
      const dept = e.department || "Non assigné";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const ROLE_LABELS: Record<string, string> = {
    employee: "Employé",
    manager: "Manager",
    team_lead: "Chef d’équipe",
    admin: "Administrateur",
  };


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total employés</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            {departments.length} départements • {positions.length} postes
          </p>
        </CardContent>
      </Card>

      {/* Actifs */}
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

      {/* Par rôle */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Répartition par rôle</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(byRole)
            .filter(([role]) => role !== "team_lead")
            .map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABELS[role]}
                </Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Top département */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top département</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {Object.entries(byDepartment).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(byDepartment)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 2)
                .map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-xs truncate">{dept}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun département</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
