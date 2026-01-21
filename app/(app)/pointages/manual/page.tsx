import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/security/rbac";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ManualPointageForm } from "@/features/manager/manual-pointage-form";

export default async function ManualPointagesPage() {
  let auth;
  try {
    auth = await requirePermission("edit_pointages")();
  } catch {
    redirect("/dashboard");
  }

  const user = auth.user;

  const employees = await prisma.user.findMany({
    where: {
      role: "employee",
      status: "active",
    },
    orderBy: { firstname: "asc" },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      username: true,
      department: true,
      position: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Saisie manuelle des pointages
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Rattrapage de pointages</h1>
        <p className="text-sm text-muted-foreground">
          Permet d&apos;enregistrer les horaires d&apos;un employé pour un jour donné en cas de panne ou maintenance.
        </p>
      </div>

      <Card className="border border-border/80 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Enregistrer un pointage</CardTitle>
          <CardDescription>
            Sélectionnez l&apos;employé, la date et les heures d&apos;entrée / sortie d&apos;après le registre papier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualPointageForm
            managerId={user.id}
            employees={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}
