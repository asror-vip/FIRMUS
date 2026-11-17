import crypto from "node:crypto";

const CIPHER_PREFIX = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function assertServerOnlyRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error("crypto-secrets is server-only and cannot be used in browser runtime.");
  }
}

function getEncryptionKey(): Buffer {
  assertServerOnlyRuntime();

  const explicitKey = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  const fallbackServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const secret =
    explicitKey ||
    fallbackServiceKey ||
    (process.env.NODE_ENV !== "production" ? "dev-only-integration-secret" : "");

  if (!secret) {
    throw new Error(
      "Server konfiguratsiya xatosi: ishlab chiqarish (production) muhitida INTEGRATION_ENCRYPTION_KEY yoki SUPABASE_SERVICE_ROLE_KEY sozlanishi shart."
    );
  }

  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Encrypts a secret string using AES-256-GCM with a random 96-bit IV.
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${CIPHER_PREFIX}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypts a ciphertext string produced by `encryptSecret`.
 */
export function decryptSecret(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = String(ciphertext || "").split(":");

  if (parts.length !== 4 || parts[0] !== CIPHER_PREFIX) {
    throw new Error("Shifrlangan maʼlumot formati notoʻgʻri.");
  }

  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const encrypted = Buffer.from(parts[3], "base64");

  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
    throw new Error("Shifrlangan maʼlumot parametrlari yaroqsiz.");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Computes a lowercase hexadecimal SHA-256 digest of the input string.
 */
export function sha256Hex(value: string): string {
  assertServerOnlyRuntime();
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Generates a cryptographically secure 6-digit numeric pairing code (100000..999999).
 */
export function generateSixDigitCode(): string {
  assertServerOnlyRuntime();
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Generates a cryptographically secure 32-byte integration Bearer token.
 */
export function generateIntegrationToken(): string {
  assertServerOnlyRuntime();
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Constant-time string comparison to avoid timing side channels on hashes/tokens.
 */
export function safeEqualStrings(a: string, b: string): boolean {
  assertServerOnlyRuntime();
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
