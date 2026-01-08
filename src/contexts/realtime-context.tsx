"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/contexts/auth-context";
 import { toast } from "sonner";

export type LateAlertPayload = {
  userId: string;
  userName: string;
  timestamp: string;
};

export type PointageReminderPayload = {
  userId: string;
  message: string;
  timestamp: string;
};

interface RealtimeContextType {
  lateAlerts: LateAlertPayload[];
  clearLateAlerts: () => void;
  emitLateAlert: (payload: LateAlertPayload) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lateAlerts, setLateAlerts] = useState<LateAlertPayload[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    const socket = io(url, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const handleLateAlert = (payload: LateAlertPayload) => {
      if (user.role === "employee" && payload.userId === user.id) {
        setLateAlerts((prev) => [...prev, payload]);
      } else if (user.role === "admin" || user.role === "manager") {
        setLateAlerts((prev) => [...prev, payload]);
      }
    };

    const handlePointageExitReminder = (payload: PointageReminderPayload) => {
      if (user.role !== "employee") return;
      if (payload.userId !== user.id) return;
      toast.info(payload.message);
    };

    socket.on("employee_late_alert", handleLateAlert);
    socket.on("employee_pointage_exit_reminder", handlePointageExitReminder);

    return () => {
      socket.off("employee_late_alert", handleLateAlert);
      socket.off("employee_pointage_exit_reminder", handlePointageExitReminder);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const clearLateAlerts = () => {
    setLateAlerts([]);
  };

  const emitLateAlert = (payload: LateAlertPayload) => {
    if (!socketRef.current) return;
    socketRef.current.emit("employee_late_alert", payload);
  };

  return (
    <RealtimeContext.Provider value={{ lateAlerts, clearLateAlerts, emitLateAlert }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return ctx;
}
