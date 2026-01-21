'use client';

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
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
import { navigationRegistry, type NavigationItem } from '@/lib/navigation-registry';
import logo from '@public/logo/logo.png'
import Image from 'next/image';

// const menuItems = [
//   { title: 'Dashboard', icon: LayoutDashboard, href: '#dashboard' },
//   { title: 'Analytics', icon: BarChart3, href: '#analytics' },
//   { title: 'Users', icon: Users, href: '#users' },
//   { title: 'Content', icon: FileText, href: '#content' },
//   { title: 'Activity', icon: Activity, href: '#activity' },
//   { title: 'Database', icon: Database, href: '#database' },
//   { title: 'Security', icon: Shield, href: '#security' },
//   { title: 'Performance', icon: Zap, href: '#performance' },
//   { title: 'Notifications', icon: Bell, href: '#notifications' },
//   { title: 'Settings', icon: Settings, href: '#settings' },
// ];

export const AdminSidebar = memo(() => {
  const { user } = useAuth()
  const { hasPermission, loading: permissionsLoading, refetch: refetchPermissions } = useUserPermissions();
  const pathname = usePathname();

  const shouldShowMenuItem = useCallback((item: NavigationItem) => {
    if (!user) return false;
    if (permissionsLoading) return false;

    if (item.allowedRoles && !item.allowedRoles.includes(user.role)) {
      return false;
    }

    // Les admins voient tout
    if (user.role === 'admin') return true;

    const required = item.requiredPermissions ?? [];
    if (required.length === 0) return true;

    // Au moins une permission requise doit être présente
    return required.some((permission) => hasPermission(permission));
  }, [user, permissionsLoading, hasPermission]);

  // Construire le menu à partir de tous les items disponibles, puis filtrer par permissions
  // pour que toute personne ayant la permission d'un module voie son lien, quel que soit son rôle.
  const registryItems = useMemo(
    () => navigationRegistry.flatMap((group) => group.items),
    []
  );

  // Filtrer selon permissions/roles puis dédupliquer par chemin
  const currentMenu = useMemo(() => {
    const filtered = registryItems.filter((item) => shouldShowMenuItem(item));
    const uniqueMap = new Map<string, NavigationItem>();
    for (const item of filtered) {
      if (!uniqueMap.has(item.to)) {
        uniqueMap.set(item.to, item);
      }
    }
    return Array.from(uniqueMap.values());
  }, [registryItems, shouldShowMenuItem]);

  const homePath = user ? '/dashboard' : ''

  const activePath = useMemo(() => {
    let active = '';
    for (const item of currentMenu) {
      const matches =
        pathname === item.to || pathname.startsWith(item.to + '/');
      if (!matches) continue;
      if (!active || item.to.length > active.length) {
        active = item.to;
      }
    }
    return active;
  }, [currentMenu, pathname]);

  // État de chargement pour éviter le clignotement
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Exposer une fonction globale pour recharger les permissions (utilisé par les composants admin)
  useEffect(() => {
    (window as unknown as { refetchPermissions?: () => void | Promise<void> }).refetchPermissions = refetchPermissions;
    return () => {
      delete (window as unknown as { refetchPermissions?: () => void | Promise<void> }).refetchPermissions;
    };
  }, [refetchPermissions]);

  if (isLoading || permissionsLoading) {
    return (
      <Sidebar collapsible="icon" className="bg-cyan-600 border-cyan-600">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <div className="flex aspect-square size-20 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-300 border-t-cyan-600"></div>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Chargement...</span>
                </div>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="flex items-center justify-center h-32">
          <div className="text-sm text-cyan-100">Chargement de la navigation...</div>
        </div>
      </SidebarContent>
      <SidebarRail />
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
                <div className="flex aspect-square size-20 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-8">
                  <Image src={logo} alt="logo" width={200} height={200} />
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
                          `transition-colors duration-200 ease-out rounded-lg px-3 py-3 text-gray-100 relative overflow-hidden ` +
                          (isActive
                            ? 'border-l-4 border-white/80 bg-primary/10 text-white shadow-md before:absolute before:inset-0 before:bg-primary/20 before:-translate-y-full hover:before:translate-y-0'
                            : 'text-muted-foreground hover:bg-sidebar-accent/60 before:absolute before:inset-0 before:bg-transparent before:-translate-y-full hover:before:translate-y-0 hover:before:bg-white/5')
                        }
                      >
                        <Link 
                          prefetch={false} 
                          href={mi.to}
                          aria-current={isActive ? 'page' : undefined}
                          className="flex w-full items-center gap-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 text-white relative overflow-hidden transition-all duration-300 ease-out before:absolute before:inset-0 before:bg-white/5 before:-translate-y-full hover:before:translate-y-0 hover:before:bg-white/10"
                        >
                          <span
                            className={
                              isActive
                                ? 'h-2 w-2 rounded-full bg-primary transition-all duration-300 group-data-[collapsible=icon]:hidden'
                                : 'h-2 w-2 rounded-full bg-transparent transition-all duration-300 group-data-[collapsible=icon]:hidden'
                            }
                          />
                          <Icon className="h-4 w-4 shrink-0 text-white font-semibold transition-transform duration-300 group-hover:scale-110" />
                          <span className="truncate group-data-[collapsible=icon]:hidden text-white font-semibold transition-all duration-300 group-hover:text-white/90">
                            {mi.label}
                          </span>
                          {/* Badge indicateur pour certains éléments */}
                          {(mi.to === '/permissions' || mi.to === '/employees' || mi.to === '/reports') && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  Aucun menu disponible pour ce rôle
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

AdminSidebar.displayName = 'AdminSidebar';

export default AdminSidebar;
