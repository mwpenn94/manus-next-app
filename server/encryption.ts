/**
 * AES-256-GCM encryption utilities for sensitive data at rest.
 * Used primarily for GitHub access tokens stored in the database.
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag
const ENCODING = "base64" as const;

/**
 * Derive a 256-bit encryption key from the JWT_SECRET.
 * Uses HKDF to derive a purpose-specific key from the shared secret.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required for encryption operations");
  }
  // Use HKDF to derive a 32-byte key from the JWT secret
  return Buffer.from(crypto.hkdfSync("sha256", secret, "manus-next-token-encryption", "aes-256-gcm-key", 32));
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Pack: IV (12) + Tag (16) + Ciphertext (variable)
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString(ENCODING);
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Returns the original plaintext string.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const packed = Buffer.from(encryptedBase64, ENCODING);

  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted data: too short");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Check if a string appears to be an encrypted token (base64 with minimum length).
 * Used to detect whether a token needs decryption or is still plaintext (migration).
 */
export function isEncrypted(value: string): boolean {
  // Encrypted tokens are base64 and at least IV+TAG length when decoded
  try {
    const decoded = Buffer.from(value, ENCODING);
    return decoded.length >= IV_LENGTH + TAG_LENGTH && !value.startsWith("gho_") && !value.startsWith("ghp_") && !value.startsWith("github_pat_");
  } catch {
    return false;
  }
}

/**
 * Decrypt a token, handling both encrypted and plaintext (legacy) tokens.
 * This allows gradual migration without breaking existing tokens.
 */
export function decryptToken(token: string): string {
  if (!token) return token;
  if (!isEncrypted(token)) return token; // plaintext legacy token
  return decrypt(token);
}

/**
 * Encrypt a token for storage. Always encrypts fresh.
 */
export function encryptToken(token: string): string {
  if (!token) return token;
  return encrypt(token);
}
