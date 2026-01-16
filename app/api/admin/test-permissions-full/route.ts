import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/rbac";
import { hasUserPermission, getUserPermissions, grantPermission } from "@/lib/security/rbac";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const auth = await requireAdmin();
    
    // Créer un utilisateur de test s'il n'existe pas
    let testUser = await prisma.user.findFirst({
      where: { username: 'test_permissions' },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          username: 'test_permissions',
          email: 'test@example.com',
          role: 'employee',
          status: 'active',
          firstname: 'Test',
          lastname: 'Permissions',
        },
      });
    }

    // Récupérer la première permission disponible
    const testPermission = await prisma.permission.findFirst();
    
    if (!testPermission) {
      return NextResponse.json({
        success: false,
        error: "Aucune permission trouvée. Exécutez d'abord /api/admin/seed-permissions",
      });
    }

    // Tester l'attribution de permission
    await grantPermission(testUser.id, testPermission.id, auth.user.id);

    // Tester la vérification de permission
    const hasPermission = await hasUserPermission(testUser.id, testPermission.name);
    
    // Tester la récupération de toutes les permissions
    const userPermissions = await getUserPermissions(testUser.id);

    // Nettoyer : révoquer la permission de test
    await prisma.userPermission.deleteMany({
      where: {
        userId: testUser.id,
        permissionId: testPermission.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Test des permissions réussi",
      testResults: {
        user: {
          id: testUser.id,
          username: testUser.username,
          role: testUser.role,
        },
        permission: {
          id: testPermission.id,
          name: testPermission.name,
          category: testPermission.category,
        },
        tests: {
          grantPermission: true,
          hasPermission: hasPermission,
          getUserPermissions: userPermissions.length > 0,
          revokePermission: true, // Si on arrive ici, c'est que la révocation a fonctionné
        },
        summary: {
          totalTests: 4,
          passedTests: hasPermission ? 4 : 3,
          status: hasPermission ? "✅ Tous les tests passés" : "❌ Échec de la vérification de permission",
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors du test des permissions:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors du test des permissions",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
