"use server";

import prisma from "@/lib/prisma";
import { validateAndSanitize, SystemSettingsSchema } from "@/lib/validation/schemas";
import { requireAdmin } from "@/lib/security/rbac";
import { logSecurityEvent } from "@/lib/security/rbac";
import type { SystemSettings } from "@/generated/prisma/client";

const SYSTEM_SETTINGS_ID = 1;

// Fonction publique pour obtenir les paramètres système sans vérification admin
export async function getSystemSettings(): Promise<SystemSettings> {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: SYSTEM_SETTINGS_ID },
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: SYSTEM_SETTINGS_ID,
        workStartTime: "08:45",
        workEndTime: "17:30",
        maxSessionEndTime: "20:00",
        breakDuration: 60,
        overtimeThreshold: 8,
        holidays: [],
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        lateAlertsEnabled: true,
        pointageRemindersEnabled: true,
      },
    });
  }

  return settings;
}

export async function adminGetSystemSettings(): Promise<SystemSettings> {
  // Vérifier les permissions admin
  const auth = await requireAdmin();
  
  return getSystemSettings();
}

export async function adminUpdateSystemSettings(data: Partial<SystemSettings>) {
  // Vérifier les permissions admin
  const auth = await requireAdmin();
  
  // Valider et nettoyer les données
  const validatedData = validateAndSanitize(SystemSettingsSchema.partial(), data);
  
  const settings = await prisma.systemSettings.update({
    where: { id: SYSTEM_SETTINGS_ID },
    data: validatedData,
  });
  
  // Logger la modification
  await logSecurityEvent(
    auth.user.id,
    "SYSTEM_SETTINGS_UPDATED",
    `Modification des paramètres: ${Object.keys(validatedData).join(", ")}`
  );

  return settings;
}
