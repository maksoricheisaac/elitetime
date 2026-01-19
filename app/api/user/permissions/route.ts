import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/rbac";
import { getUserPermissions } from "@/lib/security/rbac";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();

    // Les admins ont toutes les permissions
    if (auth.user.role === 'admin') {
      const allPermissions = await prisma.permission.findMany({
        orderBy: { category: 'asc' },
      });
      return NextResponse.json({
        success: true,
        permissions: allPermissions.map(p => p.name), // Retourner uniquement les noms
        role: auth.user.role,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    // Pour les autres utilisateurs, récupérer leurs permissions spécifiques
    const userPermissions = await getUserPermissions(auth.user.id);

    return NextResponse.json({
      success: true,
      permissions: userPermissions.map(p => p.name), // Retourner uniquement les noms
      role: auth.user.role,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erreur lors de la récupération des permissions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des permissions" },
      { status: 500 }
    );
  }
}
