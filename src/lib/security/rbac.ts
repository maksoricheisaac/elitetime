import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { validateAndSanitize, UserIdSchema } from "@/lib/validation/schemas";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

// Types pour la sécurité
export interface AuthenticatedUser {
  department: string | null;
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  firstname: string | null;
  lastname: string | null;
}

export interface AuthContext {
  user: AuthenticatedUser;
  sessionToken: string;
}

// Types pour les permissions
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  grantedBy: string;
  grantedAt: Date;
  permission: Permission;
}

// Erreurs personnalisées
export class AuthenticationError extends Error {
  constructor(message = "Non authentifié") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Non autorisé") {
    super(message);
    this.name = "AuthorizationError";
  }
}

// Vérifier si l'utilisateur est authentifié
export async function getAuthenticatedUser(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    // Pas de session en cookie : rediriger proprement vers la page de connexion
    redirect("/login");
  }

  // Vérifier la session en base de données
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          firstname: true,
          lastname: true,
          department: true,
        },
      },
    },
  });

  if (!session) {
    // Session introuvable en base: tenter de nettoyer côté base puis rediriger vers /login
    try {
      await prisma.session.deleteMany({ where: { sessionToken } });
    } catch {
      // ignorer les erreurs de nettoyage
    }

    redirect("/login");
  }

  // Vérifier si la session n'est pas expirée
  if (session.expiresAt < new Date()) {
    // Supprimer la session expirée côté base et rediriger vers /login
    try {
      await prisma.session.delete({
        where: { id: session.id },
      });
    } catch {
      // ignorer les erreurs de suppression
    }

    redirect("/login");
  }

  // Vérifier si l'utilisateur est actif
  if (session.user.status !== "active") {
    // Utilisateur désactivé : invalider la session côté base et renvoyer vers /login
    try {
      await prisma.session.delete({
        where: { id: session.id },
      });
    } catch {
      // ignorer les erreurs de suppression
    }

    redirect("/login");
  }

  return {
    user: session.user,
    sessionToken,
  };
}

// Middleware pour vérifier les rôles
export function requireRole(allowedRoles: UserRole[]) {
  return async (): Promise<AuthContext> => {
    const auth = await getAuthenticatedUser();
    
    if (!allowedRoles.includes(auth.user.role)) {
      throw new AuthorizationError(`Rôle ${auth.user.role} non autorisé`);
    }

    return auth;
  };
}

// Helpers pour les rôles courants
export const requireAdmin = requireRole(["admin"]);
export const requireManagerOrAdmin = requireRole(["manager", "admin"]);
export const requireEmployeeOrAbove = requireRole(["employee", "manager", "admin"]);

// Vérifier si un utilisateur peut accéder aux données d'un autre utilisateur
export function canAccessUserData(requesterRole: UserRole, targetUserId: string, requesterId: string): boolean {
  // Un admin peut tout voir
  if (requesterRole === "admin") return true;
  
  // Un manager peut voir les données de son équipe (implémentation future)
  if (requesterRole === "manager") {
    // TODO: Implémenter la logique de hiérarchie équipe
    // Par défaut, un manager ne voit que ses propres données tant que la hiérarchie détaillée n'est pas utilisée.
    return targetUserId === requesterId;
  }
  
  // Un employé ne peut voir que ses propres données
  return targetUserId === requesterId;
}

// Valider un ID utilisateur et vérifier les permissions en appliquant la hiérarchie
export async function validateUserAccess(userId: string, requester: AuthContext): Promise<string> {
  const sanitizedUserId = validateAndSanitize(UserIdSchema, userId);

  // Raccourci : l'admin peut accéder à tout
  if (requester.user.role === "admin") {
    return sanitizedUserId;
  }

  // Récupérer l'utilisateur cible pour vérifier la hiérarchie (chef d'équipe, membres, etc.)
  const targetUser = await prisma.user.findUnique({
    where: { id: sanitizedUserId },
    select: {
      id: true,
      teamLeadId: true,
    },
  });

  if (!targetUser) {
    throw new AuthorizationError("Utilisateur cible introuvable");
  }

  const requesterId = requester.user.id;
  const role = requester.user.role;

  // L'utilisateur peut toujours accéder à ses propres données
  if (sanitizedUserId === requesterId) {
    return sanitizedUserId;
  }

  // Chef d'équipe : peut accéder aux données des membres de son équipe directe
  if (role === "team_lead") {
    if (targetUser.teamLeadId === requesterId) {
      return sanitizedUserId;
    }
    throw new AuthorizationError("Accès non autorisé aux données de cet utilisateur");
  }

  // Manager : par défaut, accès limité à lui-même ;
  // l'extension de son périmètre se fait via les permissions sur les routes concernées.
  if (role === "manager") {
    throw new AuthorizationError("Accès non autorisé aux données de cet utilisateur");
  }

  // Employé simple : uniquement ses propres données (déjà géré plus haut)
  throw new AuthorizationError("Accès non autorisé aux données de cet utilisateur");
}

// Logger de sécurité pour les actions sensibles
export async function logSecurityEvent(
  userId: string | null,
  action: string,
  details: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ipAddress?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userAgent?: string
): Promise<void> {
  try {
    const resolvedUserId = userId && userId !== "system" ? userId : null;

    await prisma.activityLog.create({
      data: {
        userId: resolvedUserId,
        action: `SECURITY: ${action}`,
        details,
        timestamp: new Date(),
        type: "user",
      },
    });
  } catch (error) {
    // Ne jamais échouer sur le logging de sécurité
    console.error("[Security Log] Erreur:", error);
  }
}

// Rate limiting simple en base de données
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  const attempts = await prisma.activityLog.count({
    where: {
      action: "LOGIN_ATTEMPT",
      details: identifier,
      timestamp: {
        gte: windowStart,
      },
    },
  });

  return attempts < maxAttempts;
}

// Marquer une tentative de connexion
export async function markLoginAttempt(identifier: string, success: boolean): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId: null, // Pas de userId pour les tentatives de connexion système
      action: success ? "LOGIN_SUCCESS" : "LOGIN_ATTEMPT",
      details: identifier,
      timestamp: new Date(),
      type: "auth",
    },
  });
}

// Réinitialiser les permissions d'un utilisateur en fonction de son rôle
export async function resetPermissionsToRoleDefaults(userId: string, role: UserRole): Promise<void> {
  // Supprimer toutes les permissions explicites actuelles
  await prisma.userPermission.deleteMany({
    where: { userId },
  });

  // Pour l'instant, seuls les managers ont des permissions par défaut explicites.
  if (role === "manager") {
    await grantDefaultManagerPermissions(userId);
  }
}

// Accorder les permissions par défaut à un manager
export async function grantDefaultManagerPermissions(userId: string): Promise<void> {
  const managerPermissionNames = [
    'view_all_pointages',
    'view_reports',
    'view_employees',
    'view_departments',
    'view_positions',
    'view_all_absences',
    'view_team_absences',
    'validate_absences',
  ];

  const permissions = await prisma.permission.findMany({
    where: {
      name: {
        in: managerPermissionNames,
      },
    },
  });

  if (permissions.length === 0) {
    return;
  }

  await prisma.userPermission.createMany({
    data: permissions.map((permission) => ({
      userId,
      permissionId: permission.id,
      grantedBy: 'system_manager_defaults',
    })),
    skipDuplicates: true,
  });
}

// Vérifier si un utilisateur a une permission spécifique
export async function hasUserPermission(userId: string, permissionName: string): Promise<boolean> {
  const userPermission = await prisma.userPermission.findFirst({
    where: {
      userId,
      permission: {
        name: permissionName,
      },
    },
    include: {
      permission: true,
    },
  });

  return !!userPermission;
}

// Vérifier si un utilisateur a des permissions dans une catégorie
export async function hasUserPermissionsInCategory(userId: string, category: string): Promise<Permission[]> {
  const userPermissions = await prisma.userPermission.findMany({
    where: {
      userId,
      permission: {
        category,
      },
    },
    include: {
      permission: true,
    },
  });

  return userPermissions.map(up => up.permission);
}

// Middleware pour vérifier les permissions spécifiques
export function requirePermission(permissionName: string) {
  return async (): Promise<AuthContext> => {
    const auth = await getAuthenticatedUser();
    
    // Les admins ont toutes les permissions
    if (auth.user.role === "admin") {
      return auth;
    }
    
    const hasPermission = await hasUserPermission(auth.user.id, permissionName);
    
    if (!hasPermission) {
      throw new AuthorizationError(`Permission '${permissionName}' requise`);
    }

    return auth;
  };
}

// Middleware pour vérifier qu'au moins une permission parmi une liste est présente
export function requireAnyPermission(permissionNames: string[]) {
  return async (): Promise<AuthContext> => {
    const auth = await getAuthenticatedUser();

    // Les admins ont toutes les permissions
    if (auth.user.role === "admin") {
      return auth;
    }

    for (const name of permissionNames) {
      const hasPermission = await hasUserPermission(auth.user.id, name);
      if (hasPermission) {
        return auth;
      }
    }

    throw new AuthorizationError(
      `Une des permissions suivantes est requise : ${permissionNames.join(", ")}`,
    );
  };
}

// Middleware pour vérifier les permissions par catégorie
export function requirePermissionInCategory(category: string) {
  return async (): Promise<AuthContext> => {
    const auth = await getAuthenticatedUser();
    
    // Les admins ont toutes les permissions
    if (auth.user.role === "admin") {
      return auth;
    }
    
    const permissions = await hasUserPermissionsInCategory(auth.user.id, category);
    
    if (permissions.length === 0) {
      throw new AuthorizationError(`Permissions dans la catégorie '${category}' requises`);
    }

    return auth;
  };
}

// Obtenir toutes les permissions d'un utilisateur
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const userPermissions = await prisma.userPermission.findMany({
    where: {
      userId,
    },
    include: {
      permission: true,
    },
    orderBy: [
      {
        permission: {
          category: 'asc',
        },
      },
      {
        permission: {
          name: 'asc',
        },
      },
    ],
  });

  return userPermissions.map(up => up.permission);
}

// Accorder une permission à un utilisateur
export async function grantPermission(userId: string, permissionId: string, grantedBy: string): Promise<void> {
  await prisma.userPermission.create({
    data: {
      userId,
      permissionId,
      grantedBy,
    },
  });
}

// Révoquer une permission à un utilisateur
export async function revokePermission(userId: string, permissionId: string): Promise<void> {
  await prisma.userPermission.deleteMany({
    where: {
      userId,
      permissionId,
    },
  });
}
