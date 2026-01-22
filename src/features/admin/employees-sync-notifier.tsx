"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useNotification } from "@/contexts/notification-context";

export function EmployeesSyncNotifier() {
  const searchParams = useSearchParams();
  const synced = searchParams?.get("synced") === "1";
  const syncError = searchParams?.get("synced_error") === "1";
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    if (synced) {
      showSuccess("Synchronisation des employés avec l'AD terminée.");
    }
  }, [showSuccess, synced]);

  useEffect(() => {
    if (syncError) {
      showError("Erreur lors de la synchronisation des employés avec l'AD.");
    }
  }, [showError, syncError]);

  return null;
}
