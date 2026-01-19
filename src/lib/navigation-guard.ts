import { getAuthenticatedUser, getUserPermissions, AuthorizationError } from '@/lib/security/rbac';
import { navigationRegistry, type NavigationItem } from '@/lib/navigation-registry';
import prisma from '@/lib/prisma';

const registryItems: NavigationItem[] = navigationRegistry.flatMap((group) => group.items);

function resolveItemById(id: string): NavigationItem | undefined {
  return registryItems.find((item) => item.id === id);
}

function resolveItemsByPath(pathname: string): NavigationItem[] {
  return registryItems.filter(
    (item) => item.to === pathname || pathname.startsWith(item.to + '/')
  );
}

export async function requireNavigationAccessById(id: string) {
  const item = resolveItemById(id);
  if (!item) {
    return getAuthenticatedUser();
  }
  return requireNavigationAccess(item);
}

export async function requireNavigationAccessByPath(pathname: string) {
  const auth = await getAuthenticatedUser();
  const candidates = resolveItemsByPath(pathname);
  if (candidates.length === 0) {
    return auth;
  }

  if (auth.user.role === 'admin') {
    return auth;
  }

  const permissions = await getUserPermissions(auth.user.id);
  const permissionSet = new Set(permissions.map((permission) => permission.name));

  // On évalue chaque candidate en combinant les règles du registre et celles en base (Page)
  const allowedCandidate = await findFirstAllowedCandidate(candidates, auth, permissionSet);

  if (!allowedCandidate) {
    throw new AuthorizationError('Permission requise');
  }

  return auth;
}

async function requireNavigationAccess(
  item: NavigationItem,
  auth?: Awaited<ReturnType<typeof getAuthenticatedUser>>
) {
  const resolvedAuth = auth ?? (await getAuthenticatedUser());

  if (resolvedAuth.user.role === 'admin') {
    return resolvedAuth;
  }

  const permissions = await getUserPermissions(resolvedAuth.user.id);
  const permissionSet = new Set(permissions.map((permission) => permission.name));

  const pageRules = await loadPageRulesForItem(item);

  if (!canAccess(item, resolvedAuth, permissionSet, pageRules)) {
    throw new AuthorizationError('Permission requise');
  }

  return resolvedAuth;
}

type PageRules = {
  allowedRoles?: string[];
  requiredPermissions?: string[];
};

async function loadPageRulesForItem(
  item: NavigationItem
): Promise<PageRules | undefined> {
  // On utilise le chemin comme clé principale pour retrouver la page en base
  const page = await prisma.page.findUnique({
    where: { path: item.to },
    include: {
      pagePermissions: {
        include: { permission: true },
      },
    },
  });

  if (!page) {
    return undefined;
  }

  const requiredPermissions = page.pagePermissions.map(
    (pp: { permission: { name: string } }) => pp.permission.name
  );

  return {
    allowedRoles: page.allowedRoles,
    requiredPermissions,
  };
}

async function findFirstAllowedCandidate(
  candidates: NavigationItem[],
  auth: Awaited<ReturnType<typeof getAuthenticatedUser>>,
  permissionSet: Set<string>
) {
  for (const candidate of candidates) {
    const pageRules = await loadPageRulesForItem(candidate);
    if (canAccess(candidate, auth, permissionSet, pageRules)) {
      return candidate;
    }
  }
  return undefined;
}

function canAccess(
  item: NavigationItem,
  auth: Awaited<ReturnType<typeof getAuthenticatedUser>>,
  permissionSet: Set<string>,
  pageRules?: PageRules
) {
  const effectiveAllowedRoles = pageRules?.allowedRoles ?? item.allowedRoles;

  if (effectiveAllowedRoles && !effectiveAllowedRoles.includes(auth.user.role)) {
    return false;
  }

  const required = pageRules?.requiredPermissions ?? item.requiredPermissions ?? [];
  if (required.length === 0) {
    return true;
  }

  return required.some((permission) => permissionSet.has(permission));
}
