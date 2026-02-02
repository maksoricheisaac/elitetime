import prisma from "./prisma";


const PERMISSIONS = [
  // Pointages
  { name: "view_all_pointages", description: "Voir tous les pointages", category: "pointages" },
  { name: "view_team_pointages", description: "Voir les pointages de son équipe", category: "pointages" },
  { name: "edit_pointages", description: "Modifier les pointages", category: "pointages" },
  { name: "delete_pointages", description: "Supprimer les pointages", category: "pointages" },
  
  // Rapports
  { name: "view_reports", description: "Voir les rapports", category: "rapports" },
  { name: "download_reports", description: "Télécharger les rapports", category: "rapports" },
  { name: "export_reports", description: "Exporter les rapports", category: "rapports" },
  
  // Employés
  { name: "view_employees", description: "Voir la liste des employés", category: "employes" },
  { name: "create_employees", description: "Créer des employés", category: "employes" },
  { name: "edit_employees", description: "Modifier les employés", category: "employes" },
  { name: "delete_employees", description: "Supprimer les employés", category: "employes" },
  { name: "manage_permissions", description: "Gérer les permissions des employés", category: "employes" },
  
  // Absences
  { name: "view_all_absences", description: "Voir toutes les absences", category: "absences" },
  { name: "view_team_absences", description: "Voir les absences de son équipe", category: "absences" },
  { name: "validate_absences", description: "Valider les demandes d'absence", category: "absences" },
  
  // Logs / audit
  { name: "view_logs", description: "Voir les logs système (activités, connexions, etc.)", category: "logs" },
  
  // Paramètres
  { name: "view_settings", description: "Voir les paramètres système", category: "parametres" },
  { name: "edit_settings", description: "Modifier les paramètres système", category: "parametres" },
  
  // Départements et postes
  { name: "view_departments", description: "Voir les départements", category: "organisation" },
  { name: "manage_departments", description: "Gérer les départements", category: "organisation" },
  { name: "view_positions", description: "Voir les postes", category: "organisation" },
  { name: "manage_positions", description: "Gérer les postes", category: "organisation" },
];

export async function seedPermissions() {
  console.log("Création des permissions de base...");
  
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission,
    });
  }
  
  console.log(`${PERMISSIONS.length} permissions créées avec succès.`);

  return { created: PERMISSIONS.length };
}

