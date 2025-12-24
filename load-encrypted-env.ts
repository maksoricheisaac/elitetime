import { decryptEnvFile } from "./src/lib/crypto";
import dotenv from "dotenv";

// Déchiffre le fichier .env.enc
const decrypted = decryptEnvFile();

// Parse le contenu en objet key=value
const env = dotenv.parse(decrypted);

// Injecte dans process.env
for (const key in env) {
  if (!process.env[key]) {
    process.env[key] = env[key];
  }
}

console.log("✅ Encrypted .env loaded into process.env");
