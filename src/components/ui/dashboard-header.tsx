"use client";

import { memo, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { ModeToggle } from "./toggle-mode";
import { UserNav } from "../customs/user-nav";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useRealtime } from "@/contexts/realtime-context";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
}

export const DashboardHeader = memo(
  ({}: DashboardHeaderProps) => {
    const pathname = usePathname();
    const { lateAlerts, clearLateAlerts } = useRealtime();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState<string>("");
    const { showInfo } = useNotification();
    const hasMountedRef = useRef(false);

    const segments = pathname.split("/").filter(Boolean);

    const getSegmentLabel = (segment: string, index: number) => {
      const rootLabels: Record<string, string> = {
        employee: 'Employé',
        manager: 'Manager',
        admin: 'Admin',
      };

      const subLabels: Record<string, string> = {
        pointages: 'Mes pointages',
        absences: 'Mes absences',
        profile: 'Profil',
        team: 'Mon équipe',
        reports: 'Rapports',
        settings: 'Paramètres',
        logs: 'Logs & activité',
        users: 'Utilisateurs',
        validations: 'Validations',
      };

      if (index === 0) {
        return (
          rootLabels[segment] ??
          (segment.charAt(0).toUpperCase() + segment.slice(1))
        );
      }

      if (subLabels[segment]) {
        return subLabels[segment];
      }

      const formatted = segment.replace(/-/g, ' ');
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    const breadcrumbs =
      segments.length === 0
        ? []
        : segments.map((segment, index) => ({
            href: '/' + segments.slice(0, index + 1).join('/'),
            label: getSegmentLabel(segment, index),
          }));

    const canSeeAlerts =
      !!user && (user.role === "employee" || user.role === "admin" || user.role === "manager");

    useEffect(() => {
      const updateTime = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setCurrentTime(timeString);
      };

      updateTime();
      const intervalId = window.setInterval(updateTime, 30_000);

      return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
      if (!canSeeAlerts) return;

      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }

      if (!lateAlerts.length) return;

      const latest = lateAlerts[lateAlerts.length - 1];
      const message =
        user?.role === "employee"
          ? "Vous avez un retard enregistré sur votre journée."
          : `Nouveau retard détecté : ${latest.userName}`;

      showInfo(message);
    }, [lateAlerts.length, canSeeAlerts, showInfo, lateAlerts, user]);

    return (
      <header className="bg-primary text-primary-foreground/90 sticky top-0 z-50 flex h-16 w-full shrink-0 items-center gap-2 border-b border-border/60 shadow-sm backdrop-blur-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 text-primary-foreground" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.length === 0 ? (
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Accueil</BreadcrumbLink>
                </BreadcrumbItem>
              ) : (
                breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem
                    key={crumb.href}
                    className={index === 0 ? 'hidden md:block' : undefined}
                  >
                    {index < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <span className="font-semibold text-white">{crumb.label}</span>
                    )}
                  </BreadcrumbItem>
                ))
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="ml-auto flex items-center gap-4 px-4">
          {currentTime && (
            <div className="hidden sm:flex flex-col items-end text-xs text-cyan-50/80">
              <span className="text-sm font-semibold leading-none">{currentTime}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-80">Heure locale</span>
            </div>
          )}
          {canSeeAlerts && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`relative h-9 w-9 cursor-pointer rounded-full border border-white/10 bg-white/5 text-white shadow-sm hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-0 ${
                    lateAlerts.length > 0 ? 'ring-2 ring-destructive/70' : ''
                  }`}
                  aria-label="Notifications de retard"
                >
                  <Bell className="h-4 w-4 text-white" />
                  {lateAlerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {lateAlerts.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {lateAlerts.length > 0 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {lateAlerts.length} en attente
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {lateAlerts.length === 0 ? (
                  <DropdownMenuItem className="text-xs text-muted-foreground">
                    Aucune notification pour le moment.
                  </DropdownMenuItem>
                ) : (
                  <>
                    {lateAlerts.map((alert) => (
                      <DropdownMenuItem
                        key={alert.timestamp + alert.userId}
                        className="flex flex-col items-start space-y-1 text-xs"
                      >
                        <span className="font-medium">
                          Retard de {alert.userName}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString("fr-FR")}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        clearLateAlerts();
                      }}
                      className="justify-center text-xs font-semibold text-primary cursor-pointer"
                    >
                      Tout marquer comme lu
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <UserNav />
            <ModeToggle />
          </motion.div>
        </div>
      </header>
    );
  },
);

DashboardHeader.displayName = 'DashboardHeader';
