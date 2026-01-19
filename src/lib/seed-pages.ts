import prisma from "@/lib/prisma";
import { navigationRegistry } from "@/lib/navigation-registry";
import type { UserRole } from "@/generated/prisma/enums";

// Rôles par défaut si rien n'est spécifié sur l'item de navigation
const DEFAULT_ROLES: UserRole[] = ["employee", "team_lead", "manager", "admin"];

type PageSeedConfig = {
  code: string;
  path: string;
  label: string;
  category?: string;
  allowedRoles: UserRole[];
  requiredPermissions: string[];
};

function buildPageSeedConfig(): PageSeedConfig[] {
  return navigationRegistry.flatMap((group) =>
    group.items.map((item) => ({
      code: item.id,
      path: item.to,
      label: item.label,
      category: group.label,
      allowedRoles: (item.allowedRoles as UserRole[] | undefined) ?? DEFAULT_ROLES,
      requiredPermissions: item.requiredPermissions ?? [],
    }))
  );
}

export async function seedPages() {
  const pages = buildPageSeedConfig();

  const results: { path: string }[] = [];

  for (const page of pages) {
    // Upsert de la page principale
    const dbPage = await prisma.page.upsert({
      where: { path: page.path },
      update: {
        code: page.code,
        label: page.label,
        category: page.category,
        allowedRoles: page.allowedRoles,
      },
      create: {
        code: page.code,
        path: page.path,
        label: page.label,
        category: page.category,
        allowedRoles: page.allowedRoles,
      },
    });

    // Synchroniser les liaisons PagePermission
    await prisma.pagePermission.deleteMany({ where: { pageId: dbPage.id } });

    if (page.requiredPermissions.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: { name: { in: page.requiredPermissions } },
      });

      const byName = new Map(permissions.map((p) => [p.name, p.id]));

      for (const permName of page.requiredPermissions) {
        const permissionId = byName.get(permName);
        if (!permissionId) continue; // permission pas encore créée en base

        await prisma.pagePermission.create({
          data: {
            pageId: dbPage.id,
            permissionId,
          },
        });
      }
    }

    results.push({
      path: page.path,
    });
  }

  return {
    count: pages.length,
    pages: results,
  };
}
