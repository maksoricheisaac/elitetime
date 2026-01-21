import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireNavigationAccessById } from '@/lib/navigation-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PositionsFilter } from '@/components/customs/positions-filter';
import { PositionsTable } from '@/features/admin/positions-table';
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
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" className="cursor-pointer">
                Nouveau poste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau poste</DialogTitle>
                <DialogDescription>
                  Créez un nouveau poste pour un département.
                </DialogDescription>
              </DialogHeader>
              <form action={createPositionFromForm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-position-name">Nom du poste</Label>
                  <Input
                    id="new-position-name"
                    name="name"
                    placeholder="Ex: Développeur, Manager, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-position-department">Département</Label>
                  <Select name="departmentId" required>
                    <SelectTrigger id="new-position-department">
                      <SelectValue placeholder="Sélectionner un département" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-position-description">Description</Label>
                  <Input
                    id="new-position-description"
                    name="description"
                    placeholder="Description du poste (optionnel)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit">Créer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
