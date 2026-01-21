import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email("Email invalide").max(254).toLowerCase().trim(),
  username: z
    .string()
    .min(3, "Username trop court")
    .max(50, "Username trop long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Caractères non autorisés")
    .toLowerCase()
    .trim(),
  firstname: z.string().max(100).trim().nullable(),
  lastname: z.string().max(100).trim().nullable(),
  role: z.enum(["employee", "team_lead", "manager", "admin"]).default("employee"),
  department: z.string().max(100).trim().nullable(),
  position: z.string().max(100).trim().nullable(),
  avatar: z.string().url().nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const UpdateUserSchema = z.object({
  firstname: z.string().max(100).trim().nullable().optional(),
  lastname: z.string().max(100).trim().nullable().optional(),
  email: z.string().email("Email invalide").max(254).toLowerCase().trim().nullable().optional(),
  role: z.enum(["employee", "team_lead", "manager", "admin"]).optional(),
  department: z.string().max(100).trim().nullable().optional(),
  position: z.string().max(100).trim().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const UserIdSchema = z.string().cuid("ID utilisateur invalide");

export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
