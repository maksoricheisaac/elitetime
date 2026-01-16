import { Server, type Socket } from "socket.io";
import prisma from "@/lib/prisma";

// Types pour les événements WebSocket
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  username?: string;
}

export interface LateAlertPayload {
  userId: string;
  userName: string;
  timestamp: string;
}

export interface PointagePayload {
  userId: string;
  action: "entry" | "exit";
  timestamp: string;
}

// Middleware d'authentification WebSocket
export function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error("Token d'authentification manquant"));
    }

    // Vérifier le token en base de données (async/await correct)
    prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            status: true,
          },
        },
      },
    }).then(session => {
      if (!session) {
        return next(new Error("Session invalide"));
      }

      if (session.expiresAt < new Date()) {
        return next(new Error("Session expirée"));
      }

      if (session.user.status !== 'active') {
        return next(new Error("Utilisateur inactif"));
      }

      // Attacher les infos utilisateur au socket
      socket.userId = session.user.id;
      socket.userRole = session.user.role;
      socket.username = session.user.username;

      next();
    }).catch(error => {
      console.error("[WebSocket Auth] Erreur:", error);
      next(new Error("Erreur d'authentification"));
    });

  } catch (error) {
    console.error("[WebSocket Auth] Erreur:", error);
    next(new Error("Erreur d'authentification"));
  }
}

// Validation des payloads
export function validateLateAlertPayload(data: unknown): data is LateAlertPayload {
  if (!data || typeof data !== 'object') return false;
  
  const payload = data as { userId?: string; userName?: string; timestamp?: string };
  return (
    typeof payload.userId === 'string' &&
    typeof payload.userName === 'string' &&
    typeof payload.timestamp === 'string' &&
    payload.userId.length > 0 &&
    payload.userName.length > 0 &&
    payload.timestamp.length > 0
  );
}

export function validatePointagePayload(data: unknown): data is PointagePayload {
  if (!data || typeof data !== 'object') return false;
  
  const payload = data as { userId?: string; action?: string; timestamp?: string };
  return (
    typeof payload.userId === 'string' &&
    (payload.action === 'entry' || payload.action === 'exit') &&
    typeof payload.timestamp === 'string' &&
    payload.userId.length > 0 &&
    payload.timestamp.length > 0
  );
}

// Middleware d'autorisation par rôle
export function authorizeSocket(requiredRoles: string[]) {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    if (!socket.userRole || !requiredRoles.includes(socket.userRole)) {
      return next(new Error("Non autorisé"));
    }
    next();
  };
}

// Logger pour les événements WebSocket
export async function logWebSocketEvent(
  userId: string,
  event: string,
  details: string,
  socketId: string
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action: `WEBSOCKET: ${event}`,
        details: `${details} (Socket: ${socketId})`,
        timestamp: new Date(),
        type: "user",
      },
    });
  } catch (error) {
    console.error("[WebSocket Log] Erreur:", error);
  }
}

// Configuration CORS sécurisée pour WebSocket
export const secureCorsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'])
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  methods: ["GET", "POST"],
  credentials: true,
};

// Salles par rôle pour la communication ciblée
export const ROLE_ROOMS = {
  admin: 'admin-room',
  manager: 'manager-room',
  employee: 'employee-room',
};

// Joindre automatiquement les salles selon le rôle
export function joinRoleRooms(socket: AuthenticatedSocket) {
  if (!socket.userRole) return;
  
  // Tous les utilisateurs rejoignent leur salle de rôle
  socket.join(ROLE_ROOMS[socket.userRole as keyof typeof ROLE_ROOMS]);
  
  // Les managers rejoignent aussi la salle admin
  if (socket.userRole === 'manager') {
    socket.join(ROLE_ROOMS.admin);
  }
  
  // Les admins rejoignent toutes les salles
  if (socket.userRole === 'admin') {
    socket.join(ROLE_ROOMS.manager);
    socket.join(ROLE_ROOMS.employee);
  }
}
