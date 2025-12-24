import fs from "fs";
import path from "path";
import { encryptAndSave } from "./src/lib/crypto.ts";

const envPath = path.resolve(process.cwd(), ".env");

if (!fs.existsSync(envPath)) {
  console.error(".env file not found!");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");

// Chiffre et sauvegarde dans .env.enc
encryptAndSave(envContent);

console.log("✅ .env has been encrypted to .env.enc");
