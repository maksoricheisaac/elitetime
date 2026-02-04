"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { manualPointageFormSchema, type ManualPointageFormValues } from "@/schemas/manager/manual-pointage";
import { submitManualPointage } from "@/actions/manager/pointages";
import { useNotification } from "@/contexts/notification-context";

interface ManualPointageFormProps {
  managerId: string;
  employees: {
    id: string;
    firstname: string | null;
    lastname: string | null;
    username: string;
    department: string | null;
    position: string | null;
  }[];
}

export function ManualPointageForm({ managerId, employees }: ManualPointageFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useNotification();

  const form = useForm<ManualPointageFormValues>({
    resolver: zodResolver(manualPointageFormSchema),
    defaultValues: {
      date: "",
      rows: employees.map((e) => ({
        userId: e.id,
        entryTime: "",
        exitTime: "",
      })),
    },
    mode: "onSubmit",
  });

  const onSubmit = (values: ManualPointageFormValues) => {
    const { date, rows } = values;
    const filledRows = rows.filter((row) => row.entryTime && row.exitTime);

    if (filledRows.length === 0) {
      showWarning(
        "Aucun pointage à enregistrer. Renseignez au moins une heure d'entrée et de sortie.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const promises = filledRows.map((row) => {
          const formData = new FormData();
          formData.append("managerId", managerId);
          formData.append("userId", row.userId);
          formData.append("date", date);
          formData.append("entryTime", row.entryTime ?? "");
          formData.append("exitTime", row.exitTime ?? "");
          return submitManualPointage(formData);
        });

        await Promise.all(promises);
        showSuccess("Les pointages ont été enregistrés.");

        form.reset({
          date: "",
          rows: employees.map((e) => ({
            userId: e.id,
            entryTime: "",
            exitTime: "",
          })),
        });
      } catch (error) {
        console.error(error);
        showError("Une erreur est survenue lors de l'enregistrement des pointages.");
      }
    });
  };

  const handleReset = () => {
    form.reset({
      date: "",
      rows: employees.map((e) => ({
        userId: e.id,
        entryTime: "",
        exitTime: "",
      })),
    });
  };

  return (
    <Form {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date du pointage</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Employé</th>
                <th className="px-3 py-2 text-left font-medium">Heure d&apos;entrée</th>
                <th className="px-3 py-2 text-left font-medium">Heure de sortie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/80">
              {employees.map((e, index) => {
                const fullName = `${e.firstname ?? ""} ${e.lastname ?? ""}`.trim() || e.username;
                const details = [e.department, e.position].filter(Boolean).join(" • ");

                return (
                  <tr key={e.id}>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium">{fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          {details ? `${details} • ` : ""}
                          {e.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <FormField
                        control={form.control}
                        name={`rows.${index}.entryTime` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <FormField
                        control={form.control}
                        name={`rows.${index}.exitTime` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button
              className="cursor-pointer"
              type="button"
              variant="outline"
              onClick={() => router.push("/pointages")}
              disabled={isPending || form.formState.isSubmitting}
            >
              Retour aux pointages
            </Button>
            <Button
              className="cursor-pointer"
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isPending || form.formState.isSubmitting}
            >
              Réinitialiser les entrées
            </Button>
          </div>
          <Button
            className="cursor-pointer"
            type="submit"
            disabled={isPending || form.formState.isSubmitting}
          >
            {isPending || form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer le pointage"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
