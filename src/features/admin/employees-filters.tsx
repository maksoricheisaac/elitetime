"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const currentSearch = searchParams?.get("search") ?? "";
  const currentDepartment = searchParams?.get("department") ?? "all";
  const currentRole = searchParams?.get("role") ?? "all";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="space-y-1">
        <Label htmlFor="search" className="text-sm text-muted-foreground">
          Recherche
        </Label>
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
            name="search"
            placeholder="Nom, email, poste ou département"
            defaultValue={currentSearch}
            className="h-9 w-52 pl-9 text-sm md:w-64"
            onChange={(e) => updateSearchParam("search", e.target.value)}
          />
        </div>
      </div>

      {departments.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="department" className="text-sm text-muted-foreground">
            Département
          </Label>
          <Select
            defaultValue={currentDepartment}
            onValueChange={(value) => updateSearchParam("department", value)}
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
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="role" className="text-sm text-muted-foreground">
          Rôle
        </Label>
        <Select
          defaultValue={currentRole}
          onValueChange={(value) => updateSearchParam("role", value)}
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
      </div>
    </div>
  );
}
