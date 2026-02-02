'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import logo from '@public/logo/logo.png'
import Image from 'next/image';
import { navigationRegistry, type NavigationItem } from '@/lib/navigation-registry';

type SidebarItem = {
  to: NavigationItem['to'];
  icon: NavigationItem['icon'];
  label: NavigationItem['label'];
};

export const DynamicSidebar = memo(() => {
  const { user } = useAuth();
  const { hasPermission, loading } = useUserPermissions();
  const pathname = usePathname();

  const registryItems: NavigationItem[] = navigationRegistry.flatMap((group) => group.items);

  // Fonction pour vérifier si un élément de menu doit être affiché pour l'utilisateur courant
  const shouldShowNavigationItem = (item: NavigationItem): boolean => {
    if (!user || loading) return false;

    const { allowedRoles, requiredPermissions } = item;

    // Filtrage par rôle si défini
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return false;
    }

    // Les admins voient tout ce qui leur est autorisé par rôle
    if (user.role === 'admin') {
      return true;
    }

    const required = requiredPermissions ?? [];

    // Si aucune permission spécifique n'est requise, afficher
    if (required.length === 0) {
      return true;
    }

    // Vérifier si l'utilisateur a au moins une des permissions requises
    return required.some((permission) => hasPermission(permission));
  };

  // Construire le menu dynamiquement à partir du registre de navigation
  const buildMenuFromRegistry = (): SidebarItem[] => {
    if (!user) return [];

    const visibleItems = registryItems.filter(shouldShowNavigationItem);

    return visibleItems.map((item) => ({
      to: item.to,
      icon: item.icon,
      label: item.label,
    }));
  };

  const currentMenu = buildMenuFromRegistry();
  const homePath = user ? '/dashboard' : '';

  let activePath = '';
  for (const item of currentMenu) {
    const matches =
      pathname === item.to || pathname.startsWith(item.to + '/');
    if (!matches) continue;
    if (!activePath || item.to.length > activePath.length) {
      activePath = item.to;
    }
  }

  if (loading) {
    return (
      <Sidebar collapsible="icon" className="bg-cyan-600 border-cyan-600">
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="bg-cyan-600 border-cyan-600">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link prefetch={false} href={homePath}>
                <div className="flex aspect-square size-44 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-8">
                  <Image src={logo} alt="logo" width={300} height={300} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Elite Network Time</span>
                  <span className="truncate text-xs">
                    {user?.role === 'admin' ? 'Admin Panel' : 
                     user?.role === 'manager' ? 'Espace Manager' : 'Espace Employé'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-5 gap-3">
              {currentMenu.length > 0 ? (
                currentMenu.map((mi) => {
                  const Icon = mi.icon;
                  const isActive = mi.to === activePath || (!activePath && pathname === mi.to);
                  return (
                    <SidebarMenuItem key={mi.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={
                          `transition-colors duration-200 ease-out rounded-lg px-3 py-3 text-gray-100 ` +
                          (isActive
                            ? 'border-l-4 border-white/80 bg-primary/10 text-white shadow-md'
                            : 'text-muted-foreground hover:bg-sidebar-accent/60')
                        }
                      >
                        <Link 
                          prefetch={false} 
                          href={mi.to}
                          aria-current={isActive ? 'page' : undefined}
                          className="flex w-full items-center gap-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 text-white"
                        >
                          <span
                            className={
                              isActive
                                ? 'h-2 w-2 rounded-full bg-primary transition-colors group-data-[collapsible=icon]:hidden'
                                : 'h-2 w-2 rounded-full bg-transparent transition-colors group-data-[collapsible=icon]:hidden'
                            }
                          />
                          <Icon className="h-4 w-4 shrink-0 text-white font-semibold" />
                          <span className="truncate group-data-[collapsible=icon]:hidden text-white font-semibold">
                            {mi.label}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  Aucun menu disponible
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
});

DynamicSidebar.displayName = 'DynamicSidebar';
