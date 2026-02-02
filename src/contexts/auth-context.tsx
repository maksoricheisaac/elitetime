"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/contexts/notification-context';
import type { SafeUser } from '@/lib/session';

interface AuthContextType {
  user: SafeUser | null;
  login: (username: string, password: string) => Promise<SafeUser | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const { showSuccess } = useNotification();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (data?.user) {
          setUser(data.user as SafeUser);
        }
      } catch {
        // ignore errors, user will stay null
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (username: string, password: string): Promise<SafeUser | null> => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      let message = 'Erreur de connexion';
      try {
        const data = await res.json();
        if (data?.error) {
          message = data.error as string;
        }
      } catch {
        // ignore JSON parse error, keep generic message
      }
      throw new Error(message);
    }

    const data = await res.json();
    if (data?.user) {
      setUser(data.user as SafeUser);
      return data.user as SafeUser;
    }

    return null;
  };

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    // Couper immédiatement l'accès côté UI
    setUser(null);
    showSuccess('Vous avez été déconnecté');
    router.push('/login');

    try {
      await fetch('/api/logout', {
        method: 'POST',
      });
    } catch {
      // on ignore les erreurs réseau ici, la session côté client est déjà fermée
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, isLoggingOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
