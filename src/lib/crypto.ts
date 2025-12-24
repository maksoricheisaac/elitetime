import fs from "fs";
import path from "path";
import crypto from "crypto";

const MASTER_KEY = process.env.MASTER_KEY;
if (!MASTER_KEY) throw new Error("MASTER_KEY is missing");

// Dériver une clé de 32 bytes pour AES-256
const KEY = crypto.createHash("sha256").update(MASTER_KEY).digest();

/**
 * Chiffre le contenu d'un fichier ou d'une chaîne avec AES-256-GCM
 * @param content - texte à chiffrer
 * @returns iv + auth tag + texte chiffré au format iv:authTag:encrypted
 */
export function encryptEnv(content: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Déchiffre le fichier .env.enc avec AES-256-GCM
 * @param encryptedFilePath - chemin du fichier chiffré (défaut : .env.enc à la racine)
 * @returns contenu déchiffré
 */
export function decryptEnvFile(encryptedFilePath?: string): string {
  const filePath = encryptedFilePath ?? path.resolve(process.cwd(), ".env.enc");
  const file = fs.readFileSync(filePath, "utf8");

  const [ivHex, authTagHex, encryptedHex] = file.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Écrit le fichier chiffré sur disque
 * @param content - contenu à chiffrer
 * @param outputPath - chemin du fichier chiffré (par défaut : .env.enc)
 */
export function encryptAndSave(content: string, outputPath?: string) {
  const encrypted = encryptEnv(content);
  const pathToWrite = outputPath ?? path.resolve(process.cwd(), ".env.enc");
  fs.writeFileSync(pathToWrite, encrypted, { encoding: "utf8" });
  console.log(`✅ Encrypted file saved at: ${pathToWrite}`);
}
