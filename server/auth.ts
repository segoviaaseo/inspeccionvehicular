import crypto from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashToVerify = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashToVerify, "hex"));
}

export async function ensureAdminUser() {
  const existing = await db.select().from(users).where(eq(users.username, "admin"));
  if (existing.length === 0) {
    await db.insert(users).values({
      username: "admin",
      password: hashPassword("segovia2024"),
    });
    console.log("✅ Usuario admin creado. Usuario: admin / Contraseña: segovia2024");
  }
}

export async function getUserByUsername(username: string) {
  const rows = await db.select().from(users).where(eq(users.username, username));
  return rows[0];
}
