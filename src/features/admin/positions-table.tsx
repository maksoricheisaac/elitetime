"use client";

import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PositionWithDepartment = {
  id: string;
  name: string;
  description: string | null;
  departmentId: string;
  department: { name: string };
};

interface PositionsTableProps {
  data: PositionWithDepartment[];
  departments: { id: string; name: string }[];
  onUpdatePosition: (formData: FormData) => void;
  onDeletePosition: (formData: FormData) => void;
}

export function PositionsTable({
  data,
  departments,
  onUpdatePosition,
  onDeletePosition,
}: PositionsTableProps) {
  const columns: ColumnDef<PositionWithDepartment>[] = [
    {
      accessorKey: "name",
      header: () => <span>Nom</span>,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "department",
      header: () => <span>Département</span>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.department.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: () => <span>Description</span>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const position = row.original;

        return (
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
                <form action={onUpdatePosition} className="space-y-4">
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
                      defaultValue={position.description ?? ""}
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
                <form action={onDeletePosition} className="flex justify-end gap-2">
                  <input type="hidden" name="id" value={position.id} />
                  <Button type="submit" variant="destructive">
                    Confirmer
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
