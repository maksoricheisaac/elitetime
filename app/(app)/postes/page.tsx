import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from '@/lib/session';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PositionsFilter } from '@/components/customs/positions-filter';

async function createPosition(formData: FormData) {
  'use server';

  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const description = (formData.get('description') as string | null)?.trim() || null;
  const departmentId = (formData.get('departmentId') as string | null)?.trim();

  if (!name || !departmentId) {
    return;
  }

  await prisma.position.create({
    data: {
      name,
      description,
      departmentId,
    },
  });

  revalidatePath('/postes');
}

async function updatePosition(formData: FormData) {
  'use server';

  const id = (formData.get('id') as string | null)?.trim();
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const description = (formData.get('description') as string | null)?.trim() || null;
  const departmentId = (formData.get('departmentId') as string | null)?.trim();

  if (!id || !name || !departmentId) {
    return;
  }

  await prisma.position.update({
    where: { id },
    data: {
      name,
      description,
      departmentId,
    },
  });

  revalidatePath('/postes');
}

async function deletePosition(formData: FormData) {
  'use server';

  const id = (formData.get('id') as string | null)?.trim();
  if (!id) {
    return;
  }

  await prisma.position.delete({
    where: { id },
  });

  revalidatePath('/postes');
}

export default async function AppPositionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user) {
    redirect('/login');
  }

  const user = sanitizeUser(session.user);

  if (!['manager', 'admin'].includes(user.role)) {
    redirect(getDashboardPath(user.role));
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  const positions = await prisma.position.findMany({
    include: { department: true },
    orderBy: { name: 'asc' },
  });

  const departmentParam = searchParams?.department;
  const selectedDepartment =
    typeof departmentParam === 'string' && departmentParam.length > 0
      ? departmentParam
      : 'all';

  const filteredPositions =
    selectedDepartment === 'all'
      ? positions
      : positions.filter((p: { id: string; name: string; description: string | null; departmentId: string; department: { name: string } }) => p.departmentId === selectedDepartment);

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

      {departments.length > 1 && (
        <PositionsFilter
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          selectedDepartment={selectedDepartment}
        />
      )}

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
              <form action={createPosition} className="space-y-4">
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
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[640px] text-sm">
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[220px]">Nom</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((position: { id: string; name: string; description: string | null; departmentId: string; department: { name: string } }) => (
                  <TableRow
                    key={position.id}
                    className="border-b last:border-b-0 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="font-medium">{position.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {position.department.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {position.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                              Modifier
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Modifier le poste</DialogTitle>
                              <DialogDescription>
                                Mettez à jour les informations du poste.
                              </DialogDescription>
                            </DialogHeader>
                            <form action={updatePosition} className="space-y-4">
                              <input type="hidden" name="id" value={position.id} />
                              <div className="space-y-2">
                                <Label htmlFor={`edit-name-${position.id}`}>
                                  Nom du poste
                                </Label>
                                <Input
                                  id={`edit-name-${position.id}`}
                                  name="name"
                                  defaultValue={position.name}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`edit-department-${position.id}`}>
                                  Département
                                </Label>
                                <Select name="departmentId" defaultValue={position.departmentId} required>
                                  <SelectTrigger id={`edit-department-${position.id}`}>
                                    <SelectValue />
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
                                <Label htmlFor={`edit-description-${position.id}`}>
                                  Description
                                </Label>
                                <Input
                                  id={`edit-description-${position.id}`}
                                  name="description"
                                  defaultValue={position.description ?? ''}
                                  placeholder="Description du poste (optionnel)"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button type="submit">Enregistrer</Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                              Supprimer
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Supprimer le poste</DialogTitle>
                              <DialogDescription>
                                Cette action est irréversible. Êtes-vous sûr de vouloir supprimer ce
                                poste&nbsp;?
                              </DialogDescription>
                            </DialogHeader>
                            <form action={deletePosition} className="flex justify-end gap-2">
                              <input type="hidden" name="id" value={position.id} />
                              <Button type="submit" variant="destructive">
                                Confirmer
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
