"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, RefreshCw, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { User } from "@/generated/prisma/client";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { EmployeesFilters } from "./employees-filters";
import {
  employeeUpdateFormSchema,
  type EmployeeUpdateFormInput,
  type EmployeeUpdateFormValues,
} from "@/schemas/admin/forms/employees";

interface DepartmentOption {
  id: string;
  name: string;
}

interface PositionWithDepartment {
  id: string;
  name: string;
  department: {
    name: string;
  } | null;
}

interface EmployeesTableProps {
  employees: User[];
  currentUserRole: User["role"];
  departments: DepartmentOption[];
  positions: PositionWithDepartment[];
  onUpdateEmployee: (formData: FormData) => void;
  onSyncFromLdap: () => Promise<void> | void;
  onSoftDeleteEmployee: (userId: string) => Promise<void> | void;
}


interface EmployeeEditDialogProps {
  employee: User;
  departments: DepartmentOption[];
  positions: PositionWithDepartment[];
  onUpdateEmployee: (formData: FormData) => void;
}

function EmployeeEditDialog({
  employee,
  departments,
  positions,
  onUpdateEmployee,
}: EmployeeEditDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<EmployeeUpdateFormInput, unknown, EmployeeUpdateFormValues>({
    resolver: zodResolver(employeeUpdateFormSchema),
    defaultValues: {
      id: employee.id,
      firstname: employee.firstname || "",
      lastname: employee.lastname || "",
      email: employee.email || "",
      role: employee.role,
      status: employee.status,
      department: employee.department || "__none",
      position: employee.position || "__none",
    },
    mode: "onSubmit",
  });

  const onSubmit = (values: EmployeeUpdateFormValues) => {
    startTransition(async () => {
      const formData = new FormData();

      formData.append("id", values.id);
      formData.append("firstname", values.firstname ?? "");
      formData.append("lastname", values.lastname ?? "");
      formData.append("email", values.email ?? "");
      formData.append("role", values.role);
      formData.append("status", values.status);
      formData.append("department", values.department ?? "__none");
      formData.append("position", values.position ?? "__none");

      await onUpdateEmployee(formData);
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <input type="hidden" name="id" value={employee.id} />

        {/* Prénom / Nom – 2 colonnes */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="firstname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Email – pleine largeur */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rôle – pleine largeur */}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rôle</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" id={`role-${employee.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employé</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Statut – pleine largeur (disabled) */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut (géré par l&apos;AD)</FormLabel>
              <FormControl>
                <Select value={field.value} disabled>
                  <SelectTrigger className="w-full" id={`status-${employee.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="deleted">Supprimé</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Département – pleine largeur */}
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Département</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? "__none"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    className="w-full"
                    id={`department-${employee.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Poste – pleine largeur */}
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poste</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? "__none"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    className="w-full"
                    id={`position-${employee.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                        {p.department ? ` (${p.department.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="submit" className="cursor-pointer" disabled={isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Form>
  );
}


export default function EmployeesTable({
  employees,
  currentUserRole,
  departments,
  positions,
  onUpdateEmployee,
  onSyncFromLdap,
  onSoftDeleteEmployee,
}: EmployeesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusSort, setStatusSort] = useState<"none" | "active-first" | "inactive-first" | "deleted-first">(
    "none",
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: () => <span>Nom</span>,
      cell: ({ row }) => {
        const e = row.original;
        return (
          <span className="font-medium">
            {e.firstname} {e.lastname}
          </span>
        );
      },
    },
    {
      accessorKey: "email",
      header: () => <span>Email</span>,
      cell: ({ row }) => <span className="text-xs">{row.original.email || "-"}</span>,
    },
    {
      accessorKey: "role",
      header: () => <span>Rôle</span>,
      cell: ({ row }) => {
        const e = row.original;
        const label =
          e.role === "employee"
            ? "Employé"
            : e.role === "team_lead"
              ? "Chef d'équipe"
              : e.role === "manager"
                ? "Manager"
                : "Admin";
        return (
          <Badge variant="outline" className="text-xs">
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "department",
      header: () => <span>Département</span>,
      cell: ({ row }) => <span>{row.original.department || "-"}</span>,
    },
    {
      accessorKey: "position",
      header: () => <span>Poste</span>,
      cell: ({ row }) => <span>{row.original.position || "-"}</span>,
    },
    {
      accessorKey: "status",
      header: () => <span>Statut</span>,
      cell: ({ row }) => {
        const e = row.original;
        const label =
          e.status === "active" ? "Actif" : e.status === "inactive" ? "Inactif" : "Supprimé";
        const variant =
          e.status === "active" ? "default" : e.status === "inactive" ? "secondary" : "outline";
        return (
          <Badge variant={variant} className="text-xs">
            {label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="text-right">Actions</span>,
      cell: ({ row }) => {
        const e = row.original;

        if (currentUserRole !== "admin") {
          return null;
        }

        return (
          <div className="flex justify-end gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="cursor-pointer" type="button" variant="outline" size="sm">
                  <Pencil className="h-3 w-3" />
                  <span>Modifier</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Modifier l&apos;employé</DialogTitle>
                  <DialogDescription>
                    Mettez à jour les informations de l&apos;employé.
                  </DialogDescription>
                </DialogHeader>
                <EmployeeEditDialog
                  employee={e}
                  departments={departments}
                  positions={positions}
                  onUpdateEmployee={onUpdateEmployee}
                />
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="cursor-pointer"
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting || e.status === "deleted"}
                >
                  <Trash className="h-3 w-3" />
                  <span>Supprimer</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L&apos;utilisateur sera marqué comme &quot;supprimé&quot; et ne pourra plus se connecter. Cette action
                    est réversible uniquement via une modification manuelle de son statut.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      startDeleteTransition(async () => {
                        await onSoftDeleteEmployee(e.id);
                      });
                    }}
                  >
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  const [isSyncing, startSyncTransition] = useTransition();

  const statusPriority: Record<User["status"], number> = {
    active: 0,
    inactive: 1,
    deleted: 2,
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (statusSort === "none") return 0;

    const aScore = statusPriority[a.status];
    const bScore = statusPriority[b.status];

    if (statusSort === "active-first") return aScore - bScore;
    if (statusSort === "deleted-first") return bScore - aScore;
    if (statusSort === "inactive-first") {
      const inactiveWeight = (status: User["status"]) =>
        status === "inactive" ? -1 : status === "active" ? 0 : 1;
      return inactiveWeight(a.status) - inactiveWeight(b.status);
    }

    return 0;
  });

  const totalItems = sortedEmployees.length;
  const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = sortedEmployees.slice(startIndex, endIndex);

  return (
    <Card className="border border-border/80 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Liste des employés ({employees.length})</CardTitle>
          <CardDescription>
            Vue d&apos;ensemble des employés
          </CardDescription>
        </div>
        {currentUserRole === "admin" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSyncing}
            className="cursor-pointer"
            onClick={() =>
              startSyncTransition(async () => {
                await onSyncFromLdap();
              })
            }
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            {isSyncing ? "Synchronisation..." : "Synchroniser avec l'AD"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <EmployeesFilters departments={departments} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>Trier par statut</span>
            <Select
              value={statusSort}
              onValueChange={(value) => {
                setStatusSort(value as typeof statusSort);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Ordre par défaut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ordre par défaut</SelectItem>
                <SelectItem value="active-first">Actifs en premier</SelectItem>
                <SelectItem value="inactive-first">Inactifs en premier</SelectItem>
                <SelectItem value="deleted-first">Supprimés en premier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable columns={columns} data={paginatedEmployees} />

        {totalItems > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Afficher</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>par page</span>
            </div>

            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <p className="text-xs text-muted-foreground">
                Affichage de {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalItems)} sur {totalItems} employé
                {totalItems > 1 ? "s" : ""}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          setCurrentPage((page) => page - 1);
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          setCurrentPage((page) => page + 1);
                        }
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
