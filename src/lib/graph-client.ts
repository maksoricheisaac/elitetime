import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

/**
 * Configuration Azure AD pour l'authentification
 */
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

/**
 * Vérification de la configuration au démarrage
 */
if (!tenantId || !clientId || !clientSecret) {
  console.warn(
    "[graph-client] Missing Azure configuration. Graph API will not be available."
  );
  console.warn(
    "[graph-client] Required: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
  );
}

/**
 * Credential pour l'authentification OAuth2 (Client Credentials Flow)
 * 
 * Ce credential gère automatiquement :
 * - L'obtention du token d'accès
 * - Le renouvellement du token quand il expire (~1h)
 */
const credential = tenantId && clientId && clientSecret
  ? new ClientSecretCredential(tenantId, clientId, clientSecret)
  : null;

/**
 * Client Microsoft Graph
 * 
 * Ce client est configuré pour utiliser l'authentification par application
 * (pas de user connecté, idéal pour les tâches automatisées comme le cron)
 */
export const graphClient = credential
  ? Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          try {
            const tokenResponse = await credential.getToken(
              "https://graph.microsoft.com/.default"
            );

            if (!tokenResponse?.token) {
              throw new Error("Failed to acquire access token");
            }

            return tokenResponse.token;
          } catch (error) {
            console.error("[graph-client] Failed to get access token:", error);
            throw error;
          }
        },
      },
    })
  : null;

/**
 * Vérifie si la configuration Graph API est complète
 */
export function isGraphConfigured(): boolean {
  return Boolean(tenantId && clientId && clientSecret && graphClient);
}