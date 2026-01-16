"use server";

import prisma from "@/lib/prisma";
import { validateAndSanitize, CreateUserSchema, UpdateUserSchema, UserIdSchema } from "@/lib/validation/schemas";
import { requireAdmin } from "@/lib/security/rbac";
import { logSecurityEvent } from "@/lib/security/rbac";

// Liste tous les utilisateurs pour les vues admin
export async function adminGetAllUsers() {
  // Vérifier les permissions admin
  const auth = await requireAdmin();
  
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
      department: true,
      position: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // Ne pas inclure de données sensibles
    },
  });
  
  // Logger l'accès à la liste des utilisateurs
  await logSecurityEvent(
    auth.user.id,
    "USERS_LIST_ACCESSED",
    `Consultation de la liste des utilisateurs (${users.length} résultats)`
  );
  
  return users;
}

export async function adminCreateUser(input: unknown) {
  // Vérifier les permissions admin
  const auth = await requireAdmin();
  
  // Valider et nettoyer les données
  const validatedData = validateAndSanitize(CreateUserSchema, input);
  
  const {
    email,
    username,
    firstname,
    lastname,
    role = "employee",
    department,
    position,
    avatar = null,
    status = "active",
  } = validatedData;

  // Vérifier si l'email ou username existe déjà
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email || undefined },
        { username },
      ],
    },
  });

  if (existingUser) {
    throw new Error("Un utilisateur avec cet email ou username existe déjà");
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      firstname,
      lastname,
      role,
      department,
      position,
      avatar,
      status,
    },
  });
  
  // Logger la création
  await logSecurityEvent(
    auth.user.id,
    "USER_CREATED",
    `Création utilisateur: ${username} (${role})`
  );

  return user;
}

export async function adminUpdateUser(userId: string, data: unknown) {
  // Vérifier les permissions admin
  const auth = await requireAdmin();
  
  // Valider l'ID et les données
  const sanitizedUserId = validateAndSanitize(UserIdSchema, userId);
  const validatedData = validateAndSanitize(UpdateUserSchema, data);
  
  // Vérifier que l'utilisateur existe
  const existingUser = await prisma.user.findUnique({
    where: { id: sanitizedUserId },
  });
  
  if (!existingUser) {
    throw new Error("Utilisateur non trouvé");
  }
  
  // Vérifier les doublons si email modifié
  if (validatedData.email) {
    const emailExists = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
        id: { not: sanitizedUserId },
      },
    });
    
    if (emailExists) {
      throw new Error("Cet email est déjà utilisé par un autre utilisateur");
    }
  }

  const updated = await prisma.user.update({
    where: { id: sanitizedUserId },
    data: validatedData,
  });
  
  // Logger la modification
  await logSecurityEvent(
    auth.user.id,
    "USER_UPDATED",
    `Modification utilisateur: ${existingUser.username} - ${Object.keys(validatedData).join(", ")}`
  );
  
  return updated;
}

export async function adminDeleteUser(userId: string) {
  // Vérifier les permissions admin
  const auth = await requireAdmin();
  
  // Valider l'ID
  const sanitizedUserId = validateAndSanitize(UserIdSchema, userId);
  
  // Vérifier que l'utilisateur existe
  const existingUser = await prisma.user.findUnique({
    where: { id: sanitizedUserId },
  });
  
  if (!existingUser) {
    throw new Error("Utilisateur non trouvé");
  }
  
  // Empêcher la suppression de soi-même
  if (existingUser.id === auth.user.id) {
    throw new Error("Impossible de supprimer votre propre compte");
  }
  
  await prisma.user.delete({
    where: { id: sanitizedUserId },
  });
  
  // Logger la suppression
  await logSecurityEvent(
    auth.user.id,
    "USER_DELETED",
    `Suppression utilisateur: ${existingUser.username}`
  );
}
