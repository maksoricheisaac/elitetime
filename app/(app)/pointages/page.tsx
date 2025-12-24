import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, sanitizeUser, getDashboardPath } from "@/lib/session";
import { managerGetPointagesData } from "@/actions/manager/pointages";
import { getEmployeeRecentPointages } from "@/actions/employee/pointages";
import EmployeePointagesClient from "@/features/employee/pointages";
import ManagerPointagesClient from "@/features/manager/pointages";

export default async function AppPointagesPage() {
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

  if (user.role === "employee") {
    const pointages = await getEmployeeRecentPointages(user.id, 30);
    return <EmployeePointagesClient pointages={pointages} />;
  }

  if (!["manager", "admin"].includes(user.role)) {
    redirect(getDashboardPath(user.role));
  }

  let data: Awaited<ReturnType<typeof managerGetPointagesData>>;

  if (user.role === "manager") {
    data = await managerGetPointagesData(user.id);
  } else {
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
}
