# Système de Permissions Granulaires

## 🚀 Démarrage rapide

### 1. Initialiser les permissions
```bash
curl -X POST http://localhost:3000/api/admin/seed-permissions \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=votre_token"
```

### 2. Accéder à l'interface
1. Connectez-vous en tant qu'admin
2. Allez dans `/permissions` dans le menu
3. Sélectionnez un utilisateur et attribuez les permissions

## 📋 Permissions disponibles

### Pointages
- `view_all_pointages` - Voir tous les pointages
- `view_team_pointages` - Voir les pointages de son équipe  
- `edit_pointages` - Modifier les pointages
- `delete_pointages` - Supprimer les pointages

### Rapports
- `view_reports` - Voir les rapports
- `download_reports` - Télécharger les rapports
- `export_reports` - Exporter les données

### Employés
- `view_employees` - Voir la liste des employés
- `create_employees` - Créer des employés
- `edit_employees` - Modifier les employés
- `delete_employees` - Supprimer des employés
- `manage_permissions` - Gérer les permissions

### Absences
- `view_all_absences` - Voir toutes les absences
- `view_team_absences` - Voir les absences de l'équipe
- `validate_absences` - Valider les demandes

### Paramètres
- `view_settings` - Voir les paramètres
- `edit_settings` - Modifier les paramètres

## 🔧 Utilisation dans le code

### Vérifier une permission spécifique
```typescript
import { requirePermission } from "@/lib/security/rbac";

export default async function MaPage() {
  const auth = await requirePermission('view_reports');
  // L'utilisateur a la permission, continuer...
}
```

### Vérifier une permission conditionnellement
```typescript
import { hasUserPermission } from "@/lib/security/rbac";

const canEdit = await hasUserPermission(userId, 'edit_pointages');
if (canEdit) {
  // Afficher le bouton d'édition
}
```

### Vérifier les permissions d'une catégorie
```typescript
import { requirePermissionInCategory } from "@/lib/security/rbac";

const auth = await requirePermissionInCategory('rapports');
// L'utilisateur a au moins une permission dans la catégorie rapports
```

## 🎯 Cas d'usage

### Manager RH
Donner les permissions :
- `view_employees`
- `edit_employees` 
- `validate_absences`
- `view_reports`

### Responsable d'équipe
Donner les permissions :
- `view_team_pointages`
- `view_team_absences`
- `edit_pointages`

### Assistant administratif
Donner les permissions :
- `view_reports`
- `download_reports`
- `view_employees`

## 🔍 Débogage

### Tester le système
```bash
curl http://localhost:3000/api/admin/test-permissions \
  -H "Cookie: session_token=votre_token"
```

### Vérifier les permissions en base
```sql
SELECT u.username, p.name, p.category 
FROM "User" u 
JOIN "UserPermission" up ON u.id = up."userId" 
JOIN "Permission" p ON up."permissionId" = p.id 
WHERE u.status = 'active';
```

## ⚠️ Notes importantes

1. **Admins** ont automatiquement toutes les permissions
2. **Héritage** : Les permissions s'ajoutent aux droits du rôle de base
3. **Performance** : Les vérifications sont cachées au niveau de la session
4. **Audit** : Toutes les attributions de permissions sont loguées

## 🔄 Migration depuis les rôles

Pour migrer depuis un système basé sur les rôles :

1. Identifier les permissions nécessaires par rôle
2. Attribuer les permissions correspondantes aux utilisateurs
3. Remplacer `requireRole()` par `requirePermission()` dans le code
4. Tester progressivement chaque fonctionnalité
