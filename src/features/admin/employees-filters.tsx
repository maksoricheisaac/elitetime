"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { employeesFiltersSchema, type EmployeesFiltersValues } from "@/schemas/admin/forms/employees";

interface DepartmentOption {
  id: string;
  name: string;
}

interface EmployeesFiltersProps {
  departments: DepartmentOption[];
}


export function EmployeesFilters({ departments }: EmployeesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams?.get("search") ?? "";
  const currentDepartment = searchParams?.get("department") ?? "all";
  const currentRoleParam = searchParams?.get("role");
  const currentRole: EmployeesFiltersValues["role"] =
    currentRoleParam === "employee" ||
    currentRoleParam === "manager" ||
    currentRoleParam === "admin" ||
    currentRoleParam === "all"
      ? currentRoleParam
      : "all";

  const form = useForm<EmployeesFiltersValues>({
    resolver: zodResolver(employeesFiltersSchema),
    defaultValues: {
      search: currentSearch,
      department: currentDepartment,
      role: currentRole,
    },
    // Validation à chaque changement pour suivre l'UX de filtres instantanés
    mode: "onChange",
  });

  const updateSearchParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      // quand on change un filtre, on revient à la première page de résultats éventuelle
      params.delete("page");

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url);
    },
    [router, pathname, searchParams]
  );

  return (
    <Form {...form}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl ">
        <FormField
          control={form.control}
          name="search"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recherche</FormLabel>
              <FormControl>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <Input
                    id="search"
                    placeholder="Nom, email, poste"
                    className="h-9 w-52 pl-9 text-sm md:w-64"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      field.onChange(e);
                      const raw = e.target.value;
                      void form.trigger("search").then((ok) => {
                        if (ok) {
                          updateSearchParam("search", raw);
                        }
                      });
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {departments.length > 0 && (
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Département</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? currentDepartment}
                    onValueChange={(value) => {
                      field.onChange(value);
                      void form.trigger("department").then((ok) => {
                        if (ok) {
                          updateSearchParam("department", value);
                        }
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 min-w-[160px]">
                      <SelectValue placeholder="Tous les départements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
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
        )}

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rôle</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? currentRole}
                  onValueChange={(value) => {
                    field.onChange(value);
                    void form.trigger("role").then((ok) => {
                      if (ok) {
                        updateSearchParam("role", value);
                      }
                    });
                  }}
                >
                  <SelectTrigger className="h-9 min-w-[160px]">
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
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
      </div>
    </Form>
  );
}
