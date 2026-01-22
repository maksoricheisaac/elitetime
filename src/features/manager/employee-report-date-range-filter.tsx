"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import { CalendarRange } from "@/components/ui/calendar-range";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function fromISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function EmployeeReportDateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range: DateRange | undefined = useMemo(() => {
    const fromParam = searchParams?.get("from") ?? undefined;
    const toParam = searchParams?.get("to") ?? undefined;

    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 30);
    defaultFrom.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    const from = fromISODate(fromParam) ?? defaultFrom;
    const to = fromISODate(toParam) ?? today;

    return { from, to };
  }, [searchParams]);

  const handleChange = (value: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams?.toString());

    if (!value?.from && !value?.to) {
      params.delete("from");
      params.delete("to");
    } else {
      if (value?.from) {
        params.set("from", toISODate(value.from));
      }
      if (value?.to) {
        params.set("to", toISODate(value.to));
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
    <div className="space-y-2">
      <Label htmlFor="employee-report-period">Période</Label>
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
