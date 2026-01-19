"use server";

import prisma from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

interface ManagerTeamData {
  team: User[];
}

export async function managerGetTeamData(managerId: string): Promise<ManagerTeamData> {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });

  if (!manager) {
    return { team: [] };
  }

  const teamScope = manager.department
    ? [{ department: manager.department }, { teamLeadId: managerId }]
    : [{ teamLeadId: managerId }];

  const team = await prisma.user.findMany({
    where: {
      OR: teamScope,
      role: "employee",
      status: "active",
    },
    orderBy: { firstname: "asc" },
  });

  return { team };
}
