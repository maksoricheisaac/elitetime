"use client"
import { createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showLoading: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const showSuccess = (message: string) => {
    toast.success(message, {
      className:
        'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-100',
    });
  };

  const showError = (message: string) => {
    toast.error(message, {
      className:
        'border border-destructive/70 bg-destructive/10 text-destructive dark:border-destructive/60 dark:bg-destructive/20 dark:text-destructive-foreground',
    });
  };

  const showInfo = (message: string) => {
    toast.info(message, {
      className:
        'border border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/30 dark:text-sky-100',
    });
  };

  const showWarning = (message: string) => {
    toast.warning(message, {
      className:
        'border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/30 dark:text-amber-100',
    });
  };

  const showLoading = (message: string) => {
    toast.loading(message, {
      className:
        'border border-muted/70 bg-muted text-foreground dark:border-muted/60 dark:bg-muted/40',
    });
  };

  return (
    <NotificationContext.Provider
      value={{ showSuccess, showError, showInfo, showWarning, showLoading }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
