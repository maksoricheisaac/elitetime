import type { UserRole as PrismaUserRole } from '@/generated/prisma/enums';
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
} from 'lucide-react';

export type UserRole = PrismaUserRole;

export type NavigationItem = {
  id: string;
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  requiredPermissions?: string[];
  allowedRoles?: UserRole[];
};

export type NavigationGroup = {
  id: string;
  label: string;
  items: NavigationItem[];
};

export const navigationRegistry: NavigationGroup[] = [
  {
    id: 'core',
    label: 'Navigation principale',
    items: [
      {
        id: 'dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
      },
      {
        id: 'pointages',
        to: '/pointages',
        icon: Clock,
        label: 'Pointages',
      },
      {
        id: 'profile-employee',
        to: '/profile',
        icon: UserIcon,
        label: 'Profil',
        allowedRoles: ['employee'],
      },
      {
        id: 'profile-manager',
        to: '/manager/profile',
        icon: UserIcon,
        label: 'Profil',
        allowedRoles: ['manager'],
      },
      {
        id: 'profile-admin',
        to: '/profile',
        icon: UserIcon,
        label: 'Profil',
        allowedRoles: ['admin'],
      },
    ],
  },
  {
    id: 'operations',
    label: 'Opérations',
    items: [
      {
        id: 'employees',
        to: '/employees',
        icon: Users,
        label: 'Employés',
        allowedRoles: ['admin', 'manager'],
        requiredPermissions: ['view_employees'],
      },
      {
        id: 'departements',
        to: '/departements',
        icon: Settings,
        label: 'Départements',
        allowedRoles: ['admin', 'manager'],
        requiredPermissions: ['view_departments'],
      },
      {
        id: 'postes',
        to: '/postes',
        icon: Settings,
        label: 'Postes',
        allowedRoles: ['admin', 'manager'],
        requiredPermissions: ['view_positions'],
      },
      {
        id: 'reports',
        to: '/reports',
        icon: FileText,
        label: 'Rapports',
        allowedRoles: ['admin', 'manager'],
        requiredPermissions: ['view_reports'],
      },
      {
        id: 'validations',
        to: '/validations',
        icon: CheckCircle,
        label: 'Validations',
        allowedRoles: ['admin', 'manager'],
        requiredPermissions: ['validate_absences'],
      },
      {
        id: 'absences',
        to: '/absences',
        icon: Activity,
        label: 'Absences',
        allowedRoles: ['admin', 'manager'],
        requiredPermissions: ['view_team_absences', 'view_all_absences'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'permissions',
        to: '/permissions',
        icon: Shield,
        label: 'Permissions',
        allowedRoles: ['admin'],
      },
      {
        id: 'settings',
        to: '/settings',
        icon: Settings,
        label: 'Paramètres',
        allowedRoles: ['admin'],
        requiredPermissions: ['view_settings'],
      },
      {
        id: 'logs',
        to: '/logs',
        icon: Activity,
        label: 'Logs',
        allowedRoles: ['admin'],
        requiredPermissions: ['view_all_absences'],
      },
    ],
  },
];
