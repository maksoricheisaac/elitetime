import { z } from "zod";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

// Schémas de validation centralisés avec sécurité renforcée

export const SystemSettingsSchema = z.object({
  workStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM invalide"),
  workEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM invalide"),
  maxSessionEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM invalide").optional(),
  breakDuration: z.number().int().min(0).max(480), // Max 8h
  overtimeThreshold: z.number().int().min(0).max(24), // Max 24h
  holidays: z.array(z.string().datetime()).max(50), // Max 50 jours fériés
  notificationsEnabled: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
  lateAlertsEnabled: z.boolean(),
  pointageRemindersEnabled: z.boolean(),
});

export const CreateUserSchema = z.object({
  email: z.string().email("Email invalide").max(254).toLowerCase().trim(),
  username: z.string()
    .min(3, "Username trop court")
    .max(50, "Username trop long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Caractères non autorisés")
    .toLowerCase()
    .trim(),
  firstname: z.string().max(100).trim().nullable(),
  lastname: z.string().max(100).trim().nullable(),
  role: z.enum(["employee", "manager", "admin"]).default("employee"),
  department: z.string().max(100).trim().nullable(),
  position: z.string().max(100).trim().nullable(),
  avatar: z.string().url().nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const UpdateUserSchema = z.object({
  firstname: z.string().max(100).trim().nullable().optional(),
  lastname: z.string().max(100).trim().nullable().optional(),
  email: z.string().email("Email invalide").max(254).toLowerCase().trim().nullable().optional(),
  role: z.enum(["employee", "manager", "admin"]).optional(),
  department: z.string().max(100).trim().nullable().optional(),
  position: z.string().max(100).trim().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const LoginSchema = z.object({
  username: z.string()
    .min(1, "Username requis")
    .max(100, "Username trop long")
    .regex(/^[a-zA-Z0-9._@-]+$/, "Caractères non autorisés")
    .trim(),
  password: z.string()
    .min(1, "Mot de passe requis")
    .max(255, "Mot de passe trop long"),
});

export const UserIdSchema = z.string().cuid("ID utilisateur invalide");

export const PointageSchema = z.object({
  userId: z.string().cuid(),
  date: z.string().datetime(),
  entryTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  exitTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  duration: z.number().int().min(0).max(1440), // Max 24h en minutes
});

export const AbsenceSchema = z.object({
  userId: z.string().cuid(),
  type: z.enum(["conge", "maladie", "autre"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(1, "Raison requise").max(500).trim(),
  comment: z.string().max(1000).trim().nullable(),
});

// Helper pour valider et transformer les données
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new Error(`Validation failed: ${JSON.stringify(formattedErrors)}`);
    }
    throw error;
  }
}

// Types exportés pour TypeScript
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type SystemSettingsData = z.infer<typeof SystemSettingsSchema>;
export type PointageData = z.infer<typeof PointageSchema>;
export type AbsenceData = z.infer<typeof AbsenceSchema>;
