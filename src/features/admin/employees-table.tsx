"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { User } from "@/generated/prisma/client";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
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
}


interface EmployeeEditDialogProps {
  employee: User;
  departments: DepartmentOption[];
  positions: PositionWithDepartment[];
  onUpdateEmployee: (formData: FormData) => void;
}

function EmployeeEditDialog({ employee, departments, positions, onUpdateEmployee }: EmployeeEditDialogProps) {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <input type="hidden" name="id" value={employee.id} />

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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rôle</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id={`role-${employee.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employé</SelectItem>
                      <SelectItem value="team_lead">Chef d&apos;équipe</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id={`status-${employee.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
                    <SelectTrigger id={`department-${employee.id}`}>
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
                    <SelectTrigger id={`position-${employee.id}`}>
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
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
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
}: EmployeesTableProps) {
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
        const label = e.role === "employee" ? "Employé" : e.role === "manager" ? "Manager" : "Admin";
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
        return (
          <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-xs">
            {e.status === "active" ? "Actif" : "Inactif"}
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
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Modifier
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
          </div>
        );
      },
    },
  ];

  return (
    <Card className="border border-border/80 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Liste des employés ({employees.length})</CardTitle>
        <CardDescription>
          Vue d&apos;ensemble des employés
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <EmployeesFilters departments={departments} />
        <DataTable columns={columns} data={employees} />
      </CardContent>
    </Card>
  );
}
