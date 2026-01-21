import crypto from "crypto";
import fs from "fs";
import path from "path";

const ENCRYPTED_ENV_PATH = path.join(process.cwd(), ".env.enc");
const PLAIN_ENV_PATH = path.join(process.cwd(), ".env");

export function decryptEnvFile(): string {
  if (!fs.existsSync(ENCRYPTED_ENV_PATH)) {
    return fs.existsSync(PLAIN_ENV_PATH) ? fs.readFileSync(PLAIN_ENV_PATH, "utf8") : "";
  }

  const encrypted = fs.readFileSync(ENCRYPTED_ENV_PATH);
  const secret = process.env.ENV_SECRET ?? "";

  if (!secret || encrypted.length < 17) {
    return encrypted.toString("utf8");
  }

  const iv = encrypted.subarray(0, 16);
  const data = encrypted.subarray(16);
  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
