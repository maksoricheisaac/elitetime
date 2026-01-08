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
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
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

export const menuItems = [
  {
    role: 'employee',
    menu: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/pointages', icon: Clock, label: 'Mes pointages' },
      // { to: '/employee/absences', icon: Calendar, label: 'Mes absences' },
      { to: '/profile', icon: UserIcon, label: 'Profil' },
    ]
  },
  {
    role: 'manager',
    menu: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/employees', icon: Users, label: 'Employés' },
      { to: '/pointages', icon: Clock, label: 'Pointages' },
      { to: '/departements', icon: Settings, label: 'Départements' },
      { to: '/postes', icon: Settings, label: 'Postes' },
      { to: '/validations', icon: CheckCircle, label: 'Validations' },
      { to: '/reports', icon: FileText, label: 'Rapports' },
      { to: '/manager/profile', icon: UserIcon, label: 'Profil' },
    ]
  },
  {
    role: 'admin',
    menu: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/employees', icon: Users, label: 'Employés' },
      { to: '/pointages', icon: Clock, label: 'Pointages' },
      { to: '/departements', icon: Settings, label: 'Départements' },
      { to: '/postes', icon: Settings, label: 'Postes' },
      { to: '/validations', icon: CheckCircle, label: 'Validations' },
      { to: '/reports', icon: FileText, label: 'Rapports' },
      { to: '/settings', icon: Settings, label: 'Paramètres' },
      { to: '/logs', icon: Activity, label: 'Logs' },
      { to: '/profile', icon: UserIcon, label: 'Profil' },
    ]
  }
]

export const AdminSidebar = memo(() => {
  const { user } = useAuth()
  const pathname = usePathname();

  const currentMenu = menuItems.find((m) => m.role === user?.role)?.menu ?? [];
  const homePath = user ? '/dashboard' : ''

  let activePath = ''
  for (const item of currentMenu) {
    const matches =
      pathname === item.to || pathname.startsWith(item.to + '/');
    if (!matches) continue;
    if (!activePath || item.to.length > activePath.length) {
      activePath = item.to;
    }
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
                          `transition-all duration-200 ease-out hover:translate-x-0.5 rounded-lg px-3 py-3 text-gray-100 ` +
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
