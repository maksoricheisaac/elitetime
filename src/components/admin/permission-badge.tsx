import { Badge } from '@/components/ui/badge';
import { Shield, Key } from 'lucide-react';
import { getUserPermissions, type Permission } from '@/lib/security/rbac';

interface PermissionBadgeProps {
  userId: string;
  userRole: string;
  variant?: 'default' | 'compact';
}

export async function PermissionBadge({ userId, userRole, variant = 'default' }: PermissionBadgeProps) {
  // Les admins n'ont pas besoin de badge spécial
  if (userRole === 'admin') {
    return (
      <Badge variant="default" className="bg-red-500">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    );
  }

  let permissions: Permission[] = [];
  let error = null;

  try {
    permissions = await getUserPermissions(userId);
  } catch (err) {
    console.error('Erreur lors de la récupération des permissions:', err);
    error = err;
  }

  if (error) {
    return null;
  }

  if (permissions.length === 0) {
    return variant === 'compact' ? null : (
      <Badge variant="outline" className="text-muted-foreground">
        Aucune permission
      </Badge>
    );
  }

  // Grouper les permissions par catégorie
  const categories = [...new Set(permissions?.map(p => p.category))];
  
  if (variant === 'compact') {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        <Key className="w-3 h-3 mr-1" />
        {permissions.length}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categories.slice(0, 3).map((category) => (
        <Badge key={category} variant="secondary" className="text-xs">
          {category}
        </Badge>
      ))}
      {categories.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{categories.length - 3}
        </Badge>
      )}
    </div>
  );
}
