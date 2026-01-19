import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { requireNavigationAccessById } from "@/lib/navigation-guard";

interface PointageDetailPageProps {
  params: Promise<{ employeeId: string }>;
  searchParams?: { period?: string };
}

export default async function PointageDetailPage({ params, searchParams }: PointageDetailPageProps) {
  const { employeeId } = await params;

  const auth = await requireNavigationAccessById('pointages');

  if (!["manager", "admin"].includes(auth.user.role)) {
    redirect('/dashboard');
  }

  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
  });

  if (!employee || employee.role !== "employee") {
    redirect("/pointages");
  }

  const period = searchParams?.period ?? "30"; // en jours ou "all"

  let since: Date | null = null;
  if (period !== "all") {
    const days = parseInt(period, 10);
    if (!Number.isNaN(days) && days > 0) {
      since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
    }
  }

  const pointages = await prisma.pointage.findMany({
    where: {
      userId: employee.id,
      ...(since
        ? {
            date: {
              gte: since,
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
  });

  const breaks = await prisma.break.findMany({
    where: {
      userId: employee.id,
      ...(since
        ? {
            date: {
              gte: since,
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
  });

  const breaksByDay = new Map<string, number>();
  for (const b of breaks) {
    const d = new Date(b.date as unknown as string);
    const key = d.toISOString().split("T")[0];
    const current = breaksByDay.get(key) ?? 0;
    breaksByDay.set(key, current + (b.duration ?? 0));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Détails des pointages
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.firstname} {employee.lastname}
          </h1>
          <p className="text-sm text-muted-foreground">
            Historique des pointages et pauses pour cet employé.
          </p>
        </div>
        <Button type="button" variant="outline" asChild>
          <Link href="/pointages">Retour</Link>
        </Button>
      </div>

      <Card className="border border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-1">
            <CardTitle>Historique des pointages</CardTitle>
            <CardDescription>
              Vue détaillée des heures d&apos;entrée, de sortie, des durées et des pauses associées.
            </CardDescription>
          </div>
          <form className="inline-flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-end md:gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="period-select">Période</Label>
              <select
                id="period-select"
                name="period"
                defaultValue={period}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">90 derniers jours</option>
                <option value="all">Tout l&apos;historique</option>
              </select>
            </div>
            <Button type="submit" variant="outline" size="sm" className="mt-2 md:mt-0">
              Filtrer
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[760px] text-sm">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Entrée</TableHead>
                  <TableHead>Sortie</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Pauses</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pointages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Aucun pointage trouvé pour cet employé.
                    </TableCell>
                  </TableRow>
                ) : (
                  pointages.map((p) => {
                    const d = new Date(p.date as unknown as string);
                    const durationLabel =
                      p.duration && p.duration > 0
                        ? `${Math.floor(p.duration / 60)}h ${p.duration % 60}m`
                        : "-";

                    const key = d.toISOString().split("T")[0];
                    const pauseMinutes = breaksByDay.get(key) ?? 0;
                    const pauseLabel =
                      pauseMinutes > 0
                        ? `${Math.floor(pauseMinutes / 60)}h ${pauseMinutes % 60}m`
                        : "-";

                    let statusLabel = "Normal";
                    let statusVariant: "default" | "secondary" | "outline" | "destructive" = "outline";

                    if (p.status === "late") {
                      statusLabel = "Retard";
                      statusVariant = "destructive";
                    } else if (p.status === "incomplete") {
                      statusLabel = "Incomplet";
                      statusVariant = "secondary";
                    }

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">
                          {d.toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>{p.entryTime || "-"}</TableCell>
                        <TableCell>{p.exitTime || "-"}</TableCell>
                        <TableCell>{durationLabel}</TableCell>
                        <TableCell>{pauseLabel}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
