'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface UserPermissions {
  [key: string]: boolean;
}

export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!user) {
        setPermissions({});
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/permissions');
        if (response.ok) {
          const data = await response.json();
          const permissionMap: UserPermissions = {};
          
          // Convertir le tableau en objet de lookup
          data.permissions?.forEach((permission: { name: string }) => {
            permissionMap[permission.name] = true;
          });
          
          setPermissions(permissionMap);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des permissions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [user]);

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
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
