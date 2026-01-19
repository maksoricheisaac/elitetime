import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getEmployeeRecentPointages } from "@/actions/employee/pointages";
import EmployeePointagesClient from "@/features/employee/pointages";
import ManagerPointagesClient from "@/features/manager/pointages";
import { requireNavigationAccessById } from "@/lib/navigation-guard";

export default async function AppPointagesPage() {
  const auth = await requireNavigationAccessById("pointages");
  const user = auth.user;

  // Employé : ne voit que ses propres pointages
  if (user.role === "employee") {
    const pointages = await getEmployeeRecentPointages(user.id, 30);
    return <EmployeePointagesClient pointages={pointages} canEdit={false} />;
  }

  // Managers & admins : même périmètre (tous les employés actifs)
  if (!["manager", "admin"].includes(user.role)) {
    redirect("/dashboard");
  }

  const employees = await prisma.user.findMany({
    where: {
      role: "employee",
      status: "active",
    },
    orderBy: { firstname: "asc" },
  });

  let data;

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

  return (
    <ManagerPointagesClient
      team={data.team}
      pointages={data.pointages}
      absences={data.absences}
    />
  );
}
