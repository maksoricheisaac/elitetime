"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { Pointage } from "@/generated/prisma/client";

interface EmployeePointagesClientProps {
  pointages: Pointage[];
  canEdit: boolean;
}

export default function EmployeePointagesClient({ pointages, canEdit }: EmployeePointagesClientProps) {
  const userPointages = pointages
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "normal":
        return (
          <Badge
            variant="outline"
            className="border-border bg-muted text-emerald-700 dark:bg-muted/40 dark:text-emerald-200"
          >
            Normal
          </Badge>
        );
      case "late":
        return (
          <Badge
            variant="outline"
            className="border-border bg-muted text-amber-700 dark:bg-muted/40 dark:text-amber-300"
          >
            Retard
          </Badge>
        );
      case "incomplete":
        return (
          <Badge
            variant="outline"
            className="border-border bg-muted text-primary dark:bg-muted/40 dark:text-primary"
          >
            Incomplet
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Mes pointages
        </h1>
        <p className="text-sm text-muted-foreground">
          Les 30 derniers pointages enregistrés
        </p>
      </div>

      <Card className="border border-primary/20 rounded-xl shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Clock className="h-5 w-5 text-primary" />
            <span>Historique des pointages</span>
          </CardTitle>
          <CardDescription>
            Vue simplifiée de vos derniers pointages avec les informations essentielles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[720px] text-sm">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Entrée
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sortie
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Durée
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Statut
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userPointages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Aucun pointage trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  userPointages.map((pointage) => (
                    <TableRow
                      key={pointage.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(pointage.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>{pointage.entryTime || "-"}</TableCell>
                      <TableCell>{pointage.exitTime || "-"}</TableCell>
                      <TableCell>
                        {pointage.duration > 0
                          ? `${Math.floor(pointage.duration / 60)}h ${pointage.duration % 60}m`
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(pointage.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
