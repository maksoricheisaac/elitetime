import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import LeaveManagementClient from "@/features/manager/leaves";
import { requireNavigationAccessById } from "@/lib/navigation-guard";
import type { User, Absence } from "@/generated/prisma/client";

export default async function AppLeavesPage() {
  try {
    const auth = await requireNavigationAccessById("conges");
    const currentUser = auth.user;

    let team: User[] = [];
    let absences: (Absence & {
      user: Pick<User, "id" | "firstname" | "lastname" | "department" | "position">;
    })[] = [];

    if (currentUser.role === "manager") {
      const manager = await prisma.user.findUnique({ where: { id: currentUser.id } });

      if (!manager?.department) {
        return <LeaveManagementClient team={[]} absences={[]} />;
      }

      team = await prisma.user.findMany({
        where: {
          department: manager.department,
          role: "employee",
          status: { in: ["active", "inactive"] },
        },
        orderBy: { firstname: "asc" },
      });

      if (team.length === 0) {
        return <LeaveManagementClient team={[]} absences={[]} />;
      }

      const teamIds = team.map((u) => u.id);

      absences = await prisma.absence.findMany({
        where: {
          userId: { in: teamIds },
          type: "conge",
        },
        orderBy: { startDate: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              department: true,
              position: true,
            },
          },
        },
      });
    } else {
      // Admin: gestion globale des congés
      team = await prisma.user.findMany({
        where: {
          role: "employee",
          status: { in: ["active", "inactive"] },
        },
        orderBy: { firstname: "asc" },
      });

      if (team.length === 0) {
        return <LeaveManagementClient team={[]} absences={[]} />;
      }

      const teamIds = team.map((u) => u.id);

      absences = await prisma.absence.findMany({
        where: {
          userId: { in: teamIds },
          type: "conge",
        },
        orderBy: { startDate: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              department: true,
              position: true,
            },
          },
        },
      });
    }

    return <LeaveManagementClient team={team} absences={absences} />;
  } catch {
    redirect("/dashboard");
  }
}
