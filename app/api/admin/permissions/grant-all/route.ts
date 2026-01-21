import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/rbac";

export async function POST() {
  try {
    const auth = await requireAdmin();
    const grantedById = auth.user.id;

    const [permissions, admins] = await Promise.all([
      prisma.permission.findMany(),
      prisma.user.findMany({
        where: {
          role: "admin",
          status: "active",
        },
        select: { id: true },
      }),
    ]);

    if (permissions.length === 0 || admins.length === 0) {
      return NextResponse.json({
        success: true,
        updatedAdmins: 0,
        createdLinks: 0,
        message: "Aucune permission ou aucun admin actif trouvé.",
      });
    }

    let createdLinks = 0;

    for (const admin of admins) {
      const existing = await prisma.userPermission.findMany({
        where: { userId: admin.id },
        select: { permissionId: true },
      });

      const existingSet = new Set(existing.map((up) => up.permissionId));

      const toCreate = permissions.filter((p) => !existingSet.has(p.id));
      if (toCreate.length === 0) continue;

      await prisma.userPermission.createMany({
        data: toCreate.map((p) => ({
          userId: admin.id,
          permissionId: p.id,
          grantedBy: grantedById,
        })),
      });

      createdLinks += toCreate.length;
    }

    return NextResponse.json({
      success: true,
      updatedAdmins: admins.length,
      createdLinks,
    });
  } catch (error) {
    console.error("Erreur lors de l'attribution de toutes les permissions aux admins:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'attribution des permissions aux admins.",
      },
      { status: 500 },
    );
  }
}
