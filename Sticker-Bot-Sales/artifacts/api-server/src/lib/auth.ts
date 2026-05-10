/**
 * auth.ts — JWT signing/verifying + bcrypt password helpers.
 *
 * JWT_SECRET must be set in environment.
 * Tokens expire in 30 days (customer-friendly, non-sensitive data).
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Minimal JWT implementation — no external dep needed for HS256 */
function b64url(str: string | Buffer): string {
  const b = typeof str === "string" ? Buffer.from(str) : str;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function signToken(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + EXPIRY_SECONDS, iat: Math.floor(Date.now() / 1000) }));
  const sig = b64url(createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts as [string, string, string];
    const expected = b64url(createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
    // Timing-safe comparison
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString()) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** bcrypt-compatible using Node crypto (PBKDF2 — no native bcrypt dep needed) */
const ITERATIONS = 100_000;
const KEY_LEN = 64;
const DIGEST = "sha512";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    // Use dynamic import of built-in crypto pbkdf2
    const { pbkdf2 } = require("crypto") as typeof import("crypto");
    pbkdf2(password, salt, ITERATIONS, KEY_LEN, DIGEST, (err, key) => {
      if (err) reject(err);
      else resolve(`pbkdf2$${ITERATIONS}$${salt}$${key.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const [, iters, salt, storedKey] = parts as [string, string, string, string];
  return new Promise((resolve, reject) => {
    const { pbkdf2, timingSafeEqual } = require("crypto") as typeof import("crypto");
    pbkdf2(password, salt, Number(iters), KEY_LEN, DIGEST, (err, key) => {
      if (err) reject(err);
      else {
        try {
          resolve(timingSafeEqual(Buffer.from(storedKey, "hex"), key));
        } catch {
          resolve(false);
        }
      }
    });
  });
}

/** Middleware: parse Bearer token from Authorization header */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
