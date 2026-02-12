import { runScheduledEmailJob } from "../lib/scheduled-emails";
import prisma from "./prisma";


/**
 * Script pour tester le cron manuellement
 */
async function testCron() {
  console.log("🧪 Test manuel du cron d'envoi d'emails\n");

  try {
    // Récupérer le job DAILY_REPORT
    const job = await prisma.scheduledEmailJob.findUnique({
      where: { type: "DAILY_REPORT" },
    });

    if (!job) {
      console.error("❌ Aucun job DAILY_REPORT trouvé dans la base");
      console.error("💡 Configure d'abord le planning dans l'interface admin");
      process.exit(1);
    }

    console.log(`✅ Job trouvé: ${job.type} (${job.id})`);
    console.log(`   Heure programmée: ${job.hour}:${String(job.minute).padStart(2, "0")}`);
    console.log(`   Enabled: ${job.enabled}`);
    console.log("\n🚀 Exécution du job...\n");

    // Exécuter le job
    await runScheduledEmailJob(job.id);

    console.log("\n✅ JOB EXÉCUTÉ AVEC SUCCÈS !");
    console.log("📬 Vérifie que les destinataires ont bien reçu l'email");
  } catch (error) {
    console.error("\n❌ ERREUR lors de l'exécution du job :");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testCron();