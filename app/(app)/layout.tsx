import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full blur-3xl" />
            <div className="absolute bottom-[-80px] right-[-40px] h-72 w-72 rounded-full bg-white blur-3xl dark:bg-primary/20" />
          </div>
          <div className="relative z-10 flex flex-1 flex-col gap-2 p-2 pt-0 sm:gap-4 sm:p-4">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
