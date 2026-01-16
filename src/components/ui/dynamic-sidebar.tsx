'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  Settings,
  Clock,
  UserIcon,
  CheckCircle,
  Shield,
  Calendar,
  BarChart3,
  Database,
  Bell,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import logo from '@/public/logo/logo.png'
import Image from 'next/image';

// Menu de base pour les employés
const baseEmployeeMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', requiredPermissions: [] },
  { to: '/pointages', icon: Clock, label: 'Mes pointages', requiredPermissions: [] },
  { to: '/profile', icon: UserIcon, label: 'Profil', requiredPermissions: [] },
];

// Menu étendu basé sur les permissions
const permissionBasedMenu = [
  { to: '/employees', icon: Users, label: 'Employés', requiredPermissions: ['view_employees'] },
  { to: '/reports', icon: FileText, label: 'Rapports', requiredPermissions: ['view_reports'] },
  { to: '/departements', icon: Settings, label: 'Départements', requiredPermissions: ['view_departments'] },
  { to: '/postes', icon: Settings, label: 'Postes', requiredPermissions: ['view_positions'] },
  { to: '/validations', icon: CheckCircle, label: 'Validations', requiredPermissions: ['validate_absences'] },
  { to: '/absences', icon: Calendar, label: 'Absences', requiredPermissions: ['view_team_absences', 'view_all_absences'] },
  { to: '/settings', icon: Settings, label: 'Paramètres', requiredPermissions: ['view_settings'] },
  { to: '/logs', icon: Activity, label: 'Logs', requiredPermissions: ['view_all_absences'] }, // Réutilise la même permission
];

export const DynamicSidebar = memo(() => {
  const { user } = useAuth();
  const { hasPermission, loading } = useUserPermissions();
  const pathname = usePathname();

  // Fonction pour vérifier si un élément de menu doit être affiché
  const shouldShowMenuItem = (requiredPermissions: string[]) => {
    if (!user || loading) return false;
    
    // Les admins voient tout
    if (user.role === 'admin') return true;
    
    // Si aucune permission n'est requise, afficher
    if (requiredPermissions.length === 0) return true;
    
    // Vérifier si l'utilisateur a au moins une des permissions requises
    return requiredPermissions.some(permission => hasPermission(permission));
  };

  // Construire le menu dynamiquement
  const buildMenu = () => {
    if (!user) return [];
    
    // Menu de base pour tous les employés
    let menu = [...baseEmployeeMenu];
    
    // Ajouter les éléments basés sur les permissions
    const additionalItems = permissionBasedMenu.filter(item => 
      shouldShowMenuItem(item.requiredPermissions)
    );
    
    return [...menu, ...additionalItems];
  };

  const currentMenu = buildMenu();
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
