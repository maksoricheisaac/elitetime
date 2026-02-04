"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { CalendarRange } from "@/components/ui/calendar-range";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";

function toISODate(date: Date): string {
  // Formatte la date en AAAA-MM-JJ en utilisant le fuseau local (sans passer par l'UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parts = value.split("-").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  // Construit la date en local (année, mois-1, jour) pour éviter les décalages liés à l'UTC
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function EmployeeReportDateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range: DateRange | undefined = useMemo(() => {
    const fromParam = searchParams?.get("from") ?? undefined;
    const toParam = searchParams?.get("to") ?? undefined;

    // Si aucune date n'est définie dans l'URL, on applique la période par défaut (30 derniers jours)
    if (!fromParam && !toParam) {
      const today = new Date();
      const defaultFrom = new Date();
      defaultFrom.setDate(today.getDate() - 30);
      defaultFrom.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);

      return { from: defaultFrom, to: today };
    }

    // Sinon, on respecte exactement ce qui est dans l'URL, sans remettre des valeurs par défaut
    const from = fromISODate(fromParam) ?? undefined;
    const to = fromISODate(toParam) ?? undefined;

    return { from, to };
  }, [searchParams]);

  const handleChange = (value: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams?.toString());

    // Aucun choix -> on nettoie les paramètres
    if (!value?.from && !value?.to) {
      params.delete("from");
      params.delete("to");
    } else {
      // Quand on choisit un nouveau début, on réinitialise bien la fin
      if (value?.from) {
        params.set("from", toISODate(value.from));
      } else {
        params.delete("from");
      }

      if (value?.to) {
        params.set("to", toISODate(value.to));
      } else {
        // Si on est en train de choisir la plage (un seul clic), on enlève l'ancien "to"
        params.delete("to");
      }
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const rangeLabel = useMemo(() => {
    if (!range?.from && !range?.to) return "Choisir une période";

    const fromLabel = range?.from?.toLocaleDateString("fr-FR");
    const toLabel = range?.to?.toLocaleDateString("fr-FR");

    if (fromLabel && !toLabel) return fromLabel;
    if (!fromLabel && toLabel) return toLabel;
    if (fromLabel && toLabel && fromLabel === toLabel) return fromLabel;

    if (fromLabel && toLabel) {
      return `${fromLabel} – ${toLabel}`;
    }

    return "Choisir une période";
  }, [range]);

  return (
    <div suppressHydrationWarning className="">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="employee-report-period"
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal cursor-pointer"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <CalendarRange value={range} onChange={handleChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
