"use server";

import prisma from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

interface ManagerTeamData {
  team: User[];
}

export async function managerGetTeamData(managerId: string): Promise<ManagerTeamData> {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });

  if (!manager || !manager.department) {
    return { team: [] };
  }

  const team = await prisma.user.findMany({
    where: {
      department: manager.department,
      role: "employee",
      status: "active",
    },
    orderBy: { firstname: "asc" },
  });

  return { team };
}
