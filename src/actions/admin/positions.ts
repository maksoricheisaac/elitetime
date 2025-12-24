"use server";

import prisma from "@/lib/prisma";

export async function getPositionsByDepartment(departmentId: string) {
  const positions = await prisma.position.findMany({
    where: { departmentId },
    orderBy: { name: 'asc' },
  });
  return positions;
}

export async function getAllPositions() {
  const positions = await prisma.position.findMany({
    include: { department: true },
    orderBy: { name: 'asc' },
  });
  return positions;
}

export async function createPosition(
  name: string,
  departmentId: string,
  description?: string
) {
  const position = await prisma.position.create({
    data: {
      name,
      departmentId,
      description,
    },
    include: { department: true },
  });
  return position;
}

export async function updatePosition(
  positionId: string,
  name: string,
  departmentId: string,
  description?: string
) {
  const position = await prisma.position.update({
    where: { id: positionId },
    data: {
      name,
      departmentId,
      description,
    },
    include: { department: true },
  });
  return position;
}

export async function deletePosition(positionId: string) {
  await prisma.position.delete({
    where: { id: positionId },
  });
}
