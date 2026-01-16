import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/rbac";
import { hasUserPermission, getUserPermissions } from "@/lib/security/rbac";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAdmin();
    
    // Récupérer tous les utilisateurs avec leurs permissions
    const users = await prisma.user.findMany({
      where: { status: 'active' },
      include: {
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
      take: 5, // Limiter à 5 pour le test
    });

    // Tester les permissions pour chaque utilisateur
    const testResults = [];
    
    for (const user of users) {
      const userPermissions = await getUserPermissions(user.id);
      const hasViewReports = await hasUserPermission(user.id, 'view_reports');
      const hasEditPointages = await hasUserPermission(user.id, 'edit_pointages');
      
      testResults.push({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        permissions: userPermissions.map(p => p.name),
        testPermissions: {
          view_reports: hasViewReports,
          edit_pointages: hasEditPointages,
        },
        totalPermissions: userPermissions.length,
      });
    }

    // Vérifier les permissions disponibles
    const allPermissions = await prisma.permission.findMany({
      orderBy: { category: 'asc' },
    });

    return NextResponse.json({
      success: true,
      message: "Test des permissions réussi",
      data: {
        testedUsers: testResults,
        availablePermissions: allPermissions.map(p => ({
          name: p.name,
          description: p.description,
          category: p.category,
        })),
        summary: {
          totalUsers: users.length,
          totalPermissions: allPermissions.length,
          categories: [...new Set(allPermissions.map(p => p.category))],
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors du test des permissions:", error);
    return NextResponse.json(
      { error: "Erreur lors du test des permissions" },
      { status: 500 }
    );
  }
}
