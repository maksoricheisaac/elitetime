import { graphClient, isGraphConfigured } from "./graph-client";
import type { Message } from "@microsoft/microsoft-graph-types";

/**
 * Options pour l'envoi d'email
 */
export interface EmailOptions {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

/**
 * Email de l'expéditeur (doit être un compte valide du tenant Microsoft 365)
 */
const senderEmail = process.env.GRAPH_SENDER_EMAIL;

if (!senderEmail) {
  console.warn("[email] GRAPH_SENDER_EMAIL not configured");
}

/**
 * Envoie un email via Microsoft Graph API
 * 
 * Cette fonction remplace l'ancien système SMTP par Graph API.
 * Elle utilise l'authentification OAuth2 (plus sécurisé que SMTP).
 * 
 * @param options Options d'envoi (destinataires, sujet, contenu, pièces jointes)
 * @throws Error si l'envoi échoue
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // Vérification de la configuration
  if (!isGraphConfigured()) {
    console.error("[email] Graph API not configured, skipping email");
    console.error(
      "[email] Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env"
    );
    return;
  }

  if (!senderEmail) {
    console.error("[email] GRAPH_SENDER_EMAIL not set, skipping email");
    return;
  }

  if (!options.to || options.to.length === 0) {
    console.error("[email] No recipients provided, skipping email");
    return;
  }

  console.log(
    `[email] sending via Graph API to=${options.to.join(",")} subject=${
      options.subject
    } attachments=${options.attachments?.length ?? 0}`
  );

  try {
    // Construction du message au format Microsoft Graph
    const message: Message = {
      subject: options.subject,
      body: {
        contentType: options.html ? "html" : "text",
        content: options.html || options.text || "",
      },
      toRecipients: options.to.map((email) => ({
        emailAddress: {
          address: email,
        },
      })),
    };

    // Ajout des pièces jointes si présentes
    if (options.attachments && options.attachments.length > 0) {
      message.attachments = options.attachments.map((attachment) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: attachment.filename,
        contentBytes: attachment.content.toString("base64"),
        contentType: attachment.contentType,
      }));
    }

    // Envoi via Graph API
    // Endpoint: POST /users/{userId}/sendMail
    await graphClient!
      .api(`/users/${senderEmail}/sendMail`)
      .post({
        message,
        saveToSentItems: true, // Sauvegarde dans "Éléments envoyés"
      });

    console.log(`[email] sent successfully via Graph API`);
  } catch (error: unknown) {
    console.error("[email] sendMail failed", error);

    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;

    // Messages d'erreur détaillés pour faciliter le debug
    if (statusCode === 403 || code === "Authorization_RequestDenied") {
      console.error(
        "[email] ❌ PERMISSION DENIED - L'app n'a pas la permission Mail.Send"
      );
      console.error(
        "[email] 💡 Solution: Va sur Azure Portal > App registrations > Ton app > API permissions"
      );
      console.error(
        "[email] 💡 Vérifie que 'Mail.Send' (Application) a une coche verte ✅"
      );
      console.error(
        "[email] 💡 Si non, clique 'Grant admin consent for [entreprise]'"
      );
    } else if (statusCode === 404) {
      console.error(
        `[email] ❌ USER NOT FOUND - L'email expéditeur '${senderEmail}' n'existe pas dans le tenant`
      );
      console.error(
        "[email] 💡 Solution: Vérifie que GRAPH_SENDER_EMAIL est un email valide Microsoft 365"
      );
    } else if (statusCode === 401 || code === "InvalidAuthenticationToken") {
      console.error("[email] ❌ AUTH FAILED - Token invalide ou expiré");
      console.error(
        "[email] 💡 Solution: Vérifie AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
      );
    } else if (statusCode === 429) {
      console.error("[email] ❌ RATE LIMIT - Trop de requêtes");
      console.error("[email] 💡 Solution: Attends quelques minutes avant de réessayer");
    }

    // Re-throw l'erreur pour que le cron la catch
    throw error;
  }
}