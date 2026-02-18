import { io, type Socket } from 'socket.io-client';
import { useState, useEffect } from 'react';

export class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private token: string) {}

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      console.log('[WebSocket Client] Tentative de connexion...');

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

      this.socket = io(socketUrl, {
        path: '/socket.io',
        auth: {
          token: this.token,
        },
        transports: ['polling', 'websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket Client] Connecté:', this.socket?.id);
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket Client] Erreur de connexion:', error.message);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Impossible de se connecter au serveur WebSocket'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket Client] Déconnecté:', reason);
      });

      this.socket.on('error', (error) => {
        console.error('[WebSocket Client] Erreur:', error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  sendLateAlert(userId: string, userName: string): void {
    if (!this.socket?.connected) {
      console.error('[WebSocket Client] Non connecté');
      return;
    }
    this.socket.emit('employee_late_alert', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });
  }

  sendPointageUpdate(userId: string, action: 'entry' | 'exit'): void {
    if (!this.socket?.connected) {
      console.error('[WebSocket Client] Non connecté');
      return;
    }
    this.socket.emit('pointage_update', {
      userId,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  onLateAlert(callback: (data: { userId: string; userName: string; timestamp: string }) => void): void {
    this.socket?.on('employee_late_alert', callback);
  }

  onPointageUpdate(callback: (data: { userId: string; type: string; timestamp: string }) => void): void {
    this.socket?.on('pointage_update', callback);
  }

  onError(callback: (error: Error | { message: string }) => void): void {
    this.socket?.on('error', callback);
  }
}

export function useWebSocket(token: string | null) {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const wsClient = new WebSocketClient(token);

    wsClient.connect()
      .then(() => {
        setClient(wsClient);
        setIsConnected(true);
      })
      .catch((error) => {
        console.error('Erreur WebSocket:', error);
        setIsConnected(false);
      });

    return () => {
      wsClient.disconnect();
    };
  }, [token]);

  return { client, isConnected };
}