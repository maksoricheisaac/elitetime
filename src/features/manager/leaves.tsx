"use client";

import { useMemo, useState, useTransition } from "react";
import type { User, Absence } from "@/generated/prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNotification } from "@/contexts/notification-context";
import {
  approveAbsence,
  rejectAbsence,
  createManagedLeave,
  updateManagedLeave,
  deleteManagedLeave,
} from "@/actions/manager/absences";
import { DatePicker } from "@/components/ui/date-picker";

interface LeaveManagementClientProps {
  team: User[];
  absences: (Absence & {
    user: Pick<User, "id" | "firstname" | "lastname" | "department" | "position">;
  })[];
}

export default function LeaveManagementClient({ team, absences }: LeaveManagementClientProps) {
  const { showSuccess, showError } = useNotification();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const [newLeaveUserId, setNewLeaveUserId] = useState<string>("");
  const [newLeaveStart, setNewLeaveStart] = useState<Date | undefined>();
  const [newLeaveEnd, setNewLeaveEnd] = useState<Date | undefined>();
  const [newLeaveReason, setNewLeaveReason] = useState<string>("");

  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [editLeaveStart, setEditLeaveStart] = useState<Date | undefined>();
  const [editLeaveEnd, setEditLeaveEnd] = useState<Date | undefined>();
  const [editLeaveReason, setEditLeaveReason] = useState<string>("");

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          team
            .map((e) => e.department)
            .filter((d): d is string => Boolean(d)),
        ),
      ),
    [team],
  );

  const filteredAbsences = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return absences.filter((absence) => {
      const employee = absence.user;
      const fullName = `${employee.firstname || ""} ${employee.lastname || ""}`.toLowerCase();

      const matchesSearch = term ? fullName.includes(term) : true;

      const matchesStatus =
        statusFilter === "all" || absence.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "all" || employee.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [absences, searchTerm, statusFilter, departmentFilter]);

  const editingLeave = useMemo(
    () => filteredAbsences.find((a) => a.id === editingLeaveId) ?? null,
    [filteredAbsences, editingLeaveId],
  );

  const columns: ColumnDef<(typeof filteredAbsences)[number]>[] = [
    {
      accessorKey: "employee",
      header: () => <span>Employé</span>,
      cell: ({ row }) => {
        const a = row.original;
        const employee = a.user;
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {employee.firstname} {employee.lastname}
            </span>
            <span className="text-xs text-muted-foreground">{employee.department}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "dates",
      header: () => <span>Dates</span>,
      cell: ({ row }) => {
        const a = row.original;
        const start = new Date(a.startDate as unknown as string).toLocaleDateString("fr-FR");
        const end = new Date(a.endDate as unknown as string).toLocaleDateString("fr-FR");
        return (
          <span>
            {start} → {end}
          </span>
        );
      },
    },
    {
      accessorKey: "reason",
      header: () => <span>Raison</span>,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reason}</span>,
    },
    {
      accessorKey: "status",
      header: () => <span>Statut</span>,
      cell: ({ row }) => {
        const status = row.original.status;
        let label = "En attente";
        let variant: "default" | "secondary" | "outline" | "destructive" = "secondary";

        if (status === "approved") {
          label = "Approuvé";
          variant = "default";
        } else if (status === "rejected") {
          label = "Rejeté";
          variant = "destructive";
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const a = row.original;
        const isPendingStatus = a.status === "pending";

        const handleApprove = () => {
          startTransition(async () => {
            try {
              await approveAbsence(a.id);
              showSuccess("Congé approuvé");
            } catch (error) {
              console.error(error);
              showError("Impossible d'approuver ce congé pour le moment.");
            }
          });
        };

        const handleReject = () => {
          const comment = window.prompt("Motif du rejet (optionnel)") ?? undefined;
          startTransition(async () => {
            try {
              await rejectAbsence(a.id, comment);
              showSuccess("Congé rejeté");
            } catch (error) {
              console.error(error);
              showError("Impossible de rejeter ce congé pour le moment.");
            }
          });
        };

        const handleEdit = () => {
          setEditingLeaveId(a.id);
          setEditLeaveStart(new Date(a.startDate as unknown as string));
          setEditLeaveEnd(new Date(a.endDate as unknown as string));
          setEditLeaveReason(a.reason);
        };

        const handleDelete = () => {
          const confirmed = window.confirm("Confirmer la suppression de ce congé ?");
          if (!confirmed) return;

          startTransition(async () => {
            try {
              await deleteManagedLeave(a.id);
              showSuccess("Congé supprimé");
            } catch (error) {
              console.error(error);
              showError("Impossible de supprimer ce congé pour le moment.");
            }
          });
        };

        return (
          <div className="flex justify-end gap-2">
            {isPendingStatus && (
              <>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={isPending}
                >
                  Rejeter
                </Button>
                <Button
                  className="cursor-pointer"
                  size="sm"
                  onClick={handleApprove}
                  disabled={isPending}
                >
                  Approuver
                </Button>
              </>
            )}
            <Button
              className="cursor-pointer"
              variant="outline"
              size="sm"
              onClick={handleEdit}
              disabled={isPending}
            >
              Modifier
            </Button>
            <Button
              className="cursor-pointer"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              Supprimer
            </Button>
          </div>
        );
      },
    },
  ];

  const handleCreateLeave = () => {
    if (!newLeaveUserId || !newLeaveStart || !newLeaveEnd || !newLeaveReason.trim()) {
      showError("Veuillez renseigner tous les champs du congé.");
      return;
    }

    const start = newLeaveStart;
    const end = newLeaveEnd;

    if (!start || !end || end < start) {
      showError("Période de congé invalide.");
      return;
    }

    startTransition(async () => {
      try {
        await createManagedLeave({
          userId: newLeaveUserId,
          startDate: start,
          endDate: end,
          reason: newLeaveReason.trim(),
        });
        setNewLeaveReason("");
        setNewLeaveStart(undefined);
        setNewLeaveEnd(undefined);
        showSuccess("Congé créé et approuvé.");
      } catch (error) {
        console.error(error);
        showError("Impossible de créer ce congé pour le moment.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Gestion des congés
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Congés de l&apos;équipe</h1>
        <p className="text-sm text-muted-foreground">
          Créez et validez les congés de vos collaborateurs. Les congés approuvés seront pris en compte dans les
          pointages et les rapports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer un congé</CardTitle>
          <CardDescription>Ajoutez un congé directement pour un employé (statut approuvé par défaut).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Employé</Label>
            <Select value={newLeaveUserId} onValueChange={setNewLeaveUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {team.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstname} {employee.lastname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Début</Label>
            <DatePicker
              value={newLeaveStart}
              onChange={setNewLeaveStart}
              placeholder="Date de début"
            />
          </div>
          <div className="space-y-2">
            <Label>Fin</Label>
            <DatePicker
              value={newLeaveEnd}
              onChange={setNewLeaveEnd}
              placeholder="Date de fin"
            />
          </div>
          <div className="space-y-2">
            <Label>Raison</Label>
            <Input
              placeholder="Ex: Congé annuel"
              value={newLeaveReason}
              onChange={(e) => setNewLeaveReason(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button className="cursor-pointer" onClick={handleCreateLeave} disabled={isPending}>
              Créer le congé
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des congés</CardTitle>
          <CardDescription>Filtrez et validez les demandes de congés de l&apos;équipe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Rechercher un employé</Label>
              <Input
                placeholder="Nom, prénom"
                className="w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Filtrer par statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvés</SelectItem>
                  <SelectItem value="rejected">Rejetés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {departments.length > 1 && (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Filtrer par département</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DataTable columns={columns} data={filteredAbsences} />

          {editingLeaveId && editingLeave && (
            <div className="mt-6 border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Modifier le congé sélectionné</h3>
                  <p className="text-xs text-muted-foreground">
                    {editingLeave.user.firstname} {editingLeave.user.lastname} - du{' '}
                    {new Date(editingLeave.startDate as unknown as string).toLocaleDateString('fr-FR')} au{' '}
                    {new Date(editingLeave.endDate as unknown as string).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => {
                    setEditingLeaveId(null);
                    setEditLeaveStart(undefined);
                    setEditLeaveEnd(undefined);
                    setEditLeaveReason("");
                  }}
                >
                  Annuler
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Début</Label>
                  <DatePicker
                    value={editLeaveStart}
                    onChange={setEditLeaveStart}
                    placeholder="Date de début"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin</Label>
                  <DatePicker
                    value={editLeaveEnd}
                    onChange={setEditLeaveEnd}
                    placeholder="Date de fin"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Raison</Label>
                  <Input
                    placeholder="Mettre à jour la raison"
                    value={editLeaveReason}
                    onChange={(e) => setEditLeaveReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="cursor-pointer"
                  disabled={isPending}
                  onClick={() => {
                    if (!editingLeaveId || !editLeaveStart || !editLeaveEnd || !editLeaveReason.trim()) {
                      showError("Veuillez renseigner toutes les informations du congé.");
                      return;
                    }

                    if (editLeaveEnd < editLeaveStart) {
                      showError("Période de congé invalide.");
                      return;
                    }

                    startTransition(async () => {
                      try {
                        await updateManagedLeave({
                          id: editingLeaveId,
                          startDate: editLeaveStart,
                          endDate: editLeaveEnd,
                          reason: editLeaveReason.trim(),
                        });
                        showSuccess("Congé mis à jour.");
                        setEditingLeaveId(null);
                        setEditLeaveStart(undefined);
                        setEditLeaveEnd(undefined);
                        setEditLeaveReason("");
                      } catch (error) {
                        console.error(error);
                        showError("Impossible de mettre à jour ce congé pour le moment.");
                      }
                    });
                  }}
                >
                  Enregistrer les modifications
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
