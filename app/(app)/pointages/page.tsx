import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from "@/lib/session";
import { requirePermission, hasUserPermission } from "@/lib/security/rbac";
import { managerGetPointagesData } from "@/actions/manager/pointages";
import { getEmployeeRecentPointages } from "@/actions/employee/pointages";
import EmployeePointagesClient from "@/features/employee/pointages";
import ManagerPointagesClient from "@/features/manager/pointages";

export default async function AppPointagesPage() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      redirect("/login");
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user) {
      redirect("/login");
    }

    const user = sanitizeUser(session.user);

    // Vérifier les permissions spécifiques pour les pointages
    let canViewAllPointages = false;
    let canViewTeamPointages = false;
    let canEditPointages = false;

    if (user.role !== 'admin') {
      canViewAllPointages = await hasUserPermission(user.id, 'view_all_pointages');
      canViewTeamPointages = await hasUserPermission(user.id, 'view_team_pointages');
      canEditPointages = await hasUserPermission(user.id, 'edit_pointages');
    } else {
      // Les admins ont toutes les permissions
      canViewAllPointages = true;
      canViewTeamPointages = true;
      canEditPointages = true;
    }

  // Les employés peuvent voir leurs propres pointages sans permissions supplémentaires
  if (user.role === "employee") {
    const pointages = await getEmployeeRecentPointages(user.id, 30);
    return <EmployeePointagesClient pointages={pointages} canEdit={canEditPointages} />;
  }

  // Pour les managers et admins, vérifier les permissions
  if (!["manager", "admin"].includes(user.role) && !canViewAllPointages && !canViewTeamPointages) {
    redirect(getDashboardPath(user.role));
  }

  let data: Awaited<ReturnType<typeof managerGetPointagesData>>;

  if (user.role === "manager") {
    // Un manager peut voir les pointages s'il a la permission ou par défaut
    if (!canViewTeamPointages && !canViewAllPointages) {
      redirect(getDashboardPath(user.role));
    }
    data = await managerGetPointagesData(user.id);
  } else {
    // Admin : voir tous les pointages
    const employees = await prisma.user.findMany({
      where: {
        role: "employee",
        status: "active",
      },
      orderBy: { firstname: "asc" },
    });

    if (employees.length === 0) {
      data = { team: [], pointages: [], absences: [] };
    } else {
      const teamIds = employees.map((u) => u.id);

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const pointages = await prisma.pointage.findMany({
        where: {
          userId: { in: teamIds },
          date: {
            gte: since,
          },
        },
        orderBy: { date: "desc" },
      });

      const absences = await prisma.absence.findMany({
        where: {
          userId: { in: teamIds },
        },
        orderBy: { startDate: "desc" },
      });

      data = { team: employees, pointages, absences };
    }
  }

  return (
    <ManagerPointagesClient
      team={data.team}
      pointages={data.pointages}
      absences={data.absences}
    />
  );
  } catch (error) {
    console.error('Error in pointages page:', error);
    redirect('/login');
  }
}
