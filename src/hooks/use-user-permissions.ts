'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface UserPermissions {
  [key: string]: boolean;
}

export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/permissions', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const permissionMap: UserPermissions = {};
        
        // data.permissions est maintenant un tableau de noms de permissions
        data.permissions?.forEach((permissionName: string) => {
          permissionMap[permissionName] = true;
        });
        
        setPermissions(permissionMap);
        setLastFetch(Date.now());
      } else {
        console.error('Erreur lors de la récupération des permissions:', response.statusText);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Fonction pour recharger manuellement les permissions (utile après modification)
  const refetch = useCallback(() => {
    setLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = (permissionName: string) => {
    return permissions[permissionName] || false;
  };

  const hasAnyPermission = (permissionNames: string[]) => {
    return permissionNames.some(name => permissions[name]);
  };

  const hasAllPermissions = (permissionNames: string[]) => {
    return permissionNames.every(name => permissions[name]);
  };

  return {
    permissions,
    loading,
    lastFetch,
    refetch,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
