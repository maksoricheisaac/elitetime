import { sendEmail } from "../lib/email";

/**
 * Script de test pour vérifier que l'envoi d'emails via Graph API fonctionne
 */
async function testGraphEmail() {
  console.log("🧪 Test d'envoi d'email via Graph API\n");

  try {
    await sendEmail({
      to: ["m.riche@elitenetwork.pro"], // ⚠️ Change avec ton email si besoin
      subject: "🧪 Test Graph API - EliteTime",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0078d4;">✅ Configuration Graph API réussie !</h1>
          
          <p>Ce message de test confirme que :</p>
          
          <ul>
            <li>✅ L'authentification OAuth2 fonctionne</li>
            <li>✅ Les permissions Mail.Send sont accordées</li>
            <li>✅ L'envoi d'emails est opérationnel</li>
            <li>✅ Le système est prêt pour le cron</li>
          </ul>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 12px;">
            Test effectué le ${new Date().toLocaleString("fr-FR")}<br>
            Application : EliteTime Email Scheduler
          </p>
        </div>
      `,
      text: "Configuration Graph API réussie ! L'envoi d'emails fonctionne.",
      attachments: [
        {
          filename: "test.txt",
          content: Buffer.from("Ce fichier confirme que les pièces jointes fonctionnent ! 🎉"),
          contentType: "text/plain",
        },
      ],
    });

    console.log("\n✅ EMAIL ENVOYÉ AVEC SUCCÈS !");
    console.log("📬 Vérifie ta boîte mail : m.riche@elitenetwork.pro");
    console.log("\n🎉 Tu peux maintenant lancer ton cron en production !");
  } catch (error) {
    console.error("\n❌ ERREUR lors de l'envoi :");
    console.error(error);
    console.error("\n💡 Consulte les messages d'erreur ci-dessus pour débugger");
    process.exit(1);
  }
}

testGraphEmail();