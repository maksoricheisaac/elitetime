import { z } from "zod";

const manualPointageRowSchema = z
  .object({
    userId: z.string().cuid("Employé invalide"),
    entryTime: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),
    exitTime: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      // Autoriser le cas sans heures (aucun pointage saisi pour cet employé)
      if (!data.entryTime && !data.exitTime) return true;
      // Si une heure est fournie, l'autre doit l'être aussi
      return Boolean(data.entryTime && data.exitTime);
    },
    {
      message: "Les heures d'entrée et de sortie doivent être renseignées ensemble.",
      path: ["exitTime"],
    }
  );

export const manualPointageFormSchema = z.object({
  date: z
    .string()
    .min(1, "Date requise"),
  rows: z.array(manualPointageRowSchema),
});

export type ManualPointageFormValues = z.infer<typeof manualPointageFormSchema>;
