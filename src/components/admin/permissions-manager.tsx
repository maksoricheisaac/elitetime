'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, X, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  role: string;
  userPermissions: Array<{
    id: string;
    permissionId: string;
    permission: Permission;
  }>;
}

interface PermissionsManagerProps {
  users: User[];
  permissions: Permission[];
}

export function PermissionsManager({ users, permissions }: PermissionsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const categories = Array.from(new Set(permissions.map(p => p.category))).sort();

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstname} ${user.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = permissions.filter(permission =>
    selectedCategory === 'all' || permission.category === selectedCategory
  );

  const userPermissionIds = selectedUser 
    ? selectedUser.userPermissions.map(up => up.permissionId)
    : [];

  const handlePermissionToggle = async (permissionId: string, isChecked: boolean) => {
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/permissions`, {
        method: isChecked ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Erreur lors de la mise à jour des permissions';
        throw new Error(errorMessage);
      }

      toast.success(
        isChecked 
          ? 'Permission accordée avec succès' 
          : 'Permission révoquée avec succès'
      );

      // Refresh the page to show updated permissions
      window.location.reload();
    } catch (error) {
      console.error('Error updating permission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour des permissions';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Utilisateurs
          </CardTitle>
          <CardDescription>
            Sélectionnez un utilisateur pour gérer ses permissions
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedUser?.id === user.id ? 'bg-muted border-primary' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {user.firstname?.[0] || user.username[0]}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.firstname && user.lastname 
                        ? `${user.firstname} ${user.lastname}`
                        : user.username
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email || user.username}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                  <Badge variant="outline">
                    {user.userPermissions.length} permissions
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gestion des permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions
          </CardTitle>
          <CardDescription>
            {selectedUser 
              ? `Gérer les permissions de ${selectedUser.firstname && selectedUser.lastname 
                  ? `${selectedUser.firstname} ${selectedUser.lastname}`
                  : selectedUser.username
                }`
              : 'Sélectionnez un utilisateur pour gérer ses permissions'
            }
          </CardDescription>
          <div className="flex items-center gap-2">
            <Label htmlFor="category-filter">Catégorie:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category-filter" className="w-48">
                <SelectValue placeholder="Filtrer par catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedUser ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez un utilisateur pour voir et modifier ses permissions</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {categoryPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={permission.id}
                            checked={userPermissionIds.includes(permission.id)}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(permission.id, checked as boolean)
                            }
                            disabled={isLoading || selectedUser.role === 'admin'}
                          />
                          <div>
                            <Label htmlFor={permission.id} className="font-medium cursor-pointer">
                              {permission.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Label>
                            {permission.description && (
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                        {userPermissionIds.includes(permission.id) && (
                          <Badge variant="default" className="text-xs">
                            Actif
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
