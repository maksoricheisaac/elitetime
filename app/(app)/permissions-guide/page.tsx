import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Key, Users, Settings, FileText, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const PERMISSION_CATEGORIES = [
  {
    name: 'pointages',
    icon: Clock,
    description: 'Gestion des pointages et heures de travail',
    permissions: [
      { name: 'view_all_pointages', description: 'Voir tous les pointages de tous les employés' },
      { name: 'view_team_pointages', description: 'Voir les pointages de son équipe' },
      { name: 'edit_pointages', description: 'Modifier les pointages existants' },
      { name: 'delete_pointages', description: 'Supprimer des pointages' },
    ],
  },
  {
    name: 'rapports',
    icon: FileText,
    description: 'Accès aux rapports et exportations',
    permissions: [
      { name: 'view_reports', description: 'Voir les rapports' },
      { name: 'download_reports', description: 'Télécharger les rapports en PDF/Excel' },
      { name: 'export_reports', description: 'Exporter les données brutes' },
    ],
  },
  {
    name: 'employes',
    icon: Users,
    description: 'Gestion des comptes utilisateurs',
    permissions: [
      { name: 'view_employees', description: 'Voir la liste des employés' },
      { name: 'create_employees', description: 'Créer de nouveaux comptes employés' },
      { name: 'edit_employees', description: 'Modifier les informations des employés' },
      { name: 'delete_employees', description: 'Supprimer des comptes employés' },
      { name: 'manage_permissions', description: 'Gérer les permissions des autres utilisateurs' },
    ],
  },
  {
    name: 'absences',
    icon: CheckCircle,
    description: 'Gestion des demandes d\'absence',
    permissions: [
      { name: 'view_all_absences', description: 'Voir toutes les absences' },
      { name: 'view_team_absences', description: 'Voir les absences de son équipe' },
      { name: 'validate_absences', description: 'Approuver ou rejeter les demandes d\'absence' },
    ],
  },
  {
    name: 'parametres',
    icon: Settings,
    description: 'Configuration système',
    permissions: [
      { name: 'view_settings', description: 'Voir les paramètres système' },
      { name: 'edit_settings', description: 'Modifier les paramètres système' },
    ],
  },
];

export default function PermissionsGuidePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Shield className="h-3 w-3" />
          Guide
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Guide des permissions</h1>
        <p className="text-sm text-muted-foreground">
          Comprendre et utiliser le système de permissions granulaires pour contrôler l&apos;accès aux fonctionnalités.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Comment ça fonctionne ?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">1</Badge>
              <div>
                <h4 className="font-medium">Rôles vs Permissions</h4>
                <p className="text-sm text-muted-foreground">
                  Les rôles (admin, manager, employee) donnent des accès de base. 
                  Les permissions ajoutent un contrôle granulaire.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">2</Badge>
              <div>
                <h4 className="font-medium">Admins</h4>
                <p className="text-sm text-muted-foreground">
                  Les administrateurs ont automatiquement toutes les permissions 
                  sans avoir besoin de les attribuer manuellement.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">3</Badge>
              <div>
                <h4 className="font-medium">Attribution</h4>
                <p className="text-sm text-muted-foreground">
                  Utilisez la page <Link href="/permissions" className="text-primary hover:underline">Permissions </Link> 
                  pour attribuer des droits spécifiques aux utilisateurs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cas d&apos;usage courants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">Manager RH</h4>
              <p className="text-sm text-muted-foreground">
                Donner les permissions <Badge variant="secondary" className="text-xs">view_employees</Badge>, 
                <Badge variant="secondary" className="text-xs">edit_employees</Badge>, 
                <Badge variant="secondary" className="text-xs">validate_absences</Badge>
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Responsable d&apos;équipe</h4>
              <p className="text-sm text-muted-foreground">
                Donner les permissions <Badge variant="secondary" className="text-xs">view_team_pointages</Badge>, 
                <Badge variant="secondary" className="text-xs">view_team_absences</Badge>
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Assistant administratif</h4>
              <p className="text-sm text-muted-foreground">
                Donner les permissions <Badge variant="secondary" className="text-xs">view_reports</Badge>, 
                <Badge variant="secondary" className="text-xs">download_reports</Badge>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Détail des permissions par catégorie</h2>
        
        {PERMISSION_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {category.permissions.map((permission) => (
                    <div key={permission.name} className="flex items-start gap-3 p-3 rounded-lg border">
                      <Key className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {permission.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bonnes pratiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
            <div>
              <h4 className="font-medium">Principe du moindre privilège</h4>
              <p className="text-sm text-muted-foreground">
                Donnez uniquement les permissions nécessaires pour qu&apos;un utilisateur puisse effectuer son travail.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
            <div>
              <h4 className="font-medium">Révocation régulière</h4>
              <p className="text-sm text-muted-foreground">
                Passez en revue les permissions régulièrement et révoquez celles qui ne sont plus nécessaires.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
            <div>
              <h4 className="font-medium">Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Documentez qui a quelles permissions et pourquoi pour faciliter l&apos;audit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button asChild size="lg">
          <Link href="/permissions">
            <Shield className="mr-2 h-4 w-4" />
            Gérer les permissions
          </Link>
        </Button>
      </div>
    </div>
  );
}
