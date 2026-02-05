"use client";

import { memo, useEffect, useState } from "react";
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
import { LateAlertsPanel } from "@/components/ui/late-alerts-panel";

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
    const [currentTime, setCurrentTime] = useState<string>("");

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
                      <span className="font-semibold text-white hidden">{crumb.label}</span>
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
          <LateAlertsPanel />
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
