import { NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET() {
  const encrypted = encrypt("Bonjour Riche");
  const decrypted = decrypt(encrypted);

  return NextResponse.json({
    encrypted,
    decrypted,
  });
}
