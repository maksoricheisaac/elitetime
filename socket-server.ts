import { createServer } from "http";
import { Server } from "socket.io";
import { authenticateSocket, validateLateAlertPayload, validatePointagePayload, secureCorsOptions, joinRoleRooms, logWebSocketEvent } from "@/lib/security/websocket";
import type { AuthenticatedSocket } from "@/lib/security/websocket";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: secureCorsOptions,
  transports: ['websocket', 'polling'], // Support des deux transports
});

// Middleware d'authentification global
io.use(authenticateSocket);

io.on("connection", (socket: AuthenticatedSocket) => {
  console.log(`Client connecté: ${socket.id} (User: ${socket.username}, Role: ${socket.userRole})`);
  
  // Joindre les salles selon le rôle
  joinRoleRooms(socket);
  
  // Logger la connexion
  if (socket.userId) {
    logWebSocketEvent(socket.userId, 'SOCKET_CONNECTED', 'Connexion WebSocket', socket.id);
  }

  // Gestion des alertes de retard (réservé aux managers et admins)
  socket.on("employee_late_alert", (data: unknown) => {
    // Vérifier les permissions
    if (socket.userRole !== 'manager' && socket.userRole !== 'admin') {
      socket.emit('error', { message: 'Non autorisé' });
      return;
    }
    
    // Valider le payload
    if (!validateLateAlertPayload(data)) {
      socket.emit('error', { message: 'Payload invalide' });
      return;
    }
    
    // Envoyer uniquement aux managers et admins
    io.to('admin-room').emit('employee_late_alert', data);
    
    // Logger l'événement
    if (socket.userId) {
      logWebSocketEvent(socket.userId, 'LATE_ALERT_SENT', `Alerte retard pour ${data.userName}`, socket.id);
    }
  });
  
  // Gestion des pointages en temps réel
  socket.on("pointage_update", (data: unknown) => {
    // Valider le payload
    if (!validatePointagePayload(data)) {
      socket.emit('error', { message: 'Payload invalide' });
      return;
    }
    
    // Un utilisateur ne peut envoyer que ses propres pointages
    if (socket.userRole === 'employee' && data.userId !== socket.userId) {
      socket.emit('error', { message: 'Non autorisé' });
      return;
    }
    
    // Diffuser selon le rôle
    if (socket.userRole === 'employee') {
      // Les pointages d'employés vont vers les managers/admins
      io.to('admin-room').emit('pointage_update', data);
    } else {
      // Les managers/admins peuvent diffuser à tout le monde
      io.emit('pointage_update', data);
    }
    
    // Logger l'événement
    if (socket.userId) {
      logWebSocketEvent(socket.userId, 'POINTAGE_UPDATE', `Pointage ${data.action} pour ${data.userId}`, socket.id);
    }
  });
  
  // Gestion des erreurs
  socket.on('error', (error) => {
    console.error(`[Socket ${socket.id}] Erreur:`, error);
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client déconnecté: ${socket.id} (${reason})`);
    
    // Logger la déconnexion
    if (socket.userId) {
      logWebSocketEvent(socket.userId, 'SOCKET_DISCONNECTED', `Déconnexion: ${reason}`, socket.id);
    }
  });
});

const PORT = Number(process.env.SOCKET_PORT || 4000);

httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
