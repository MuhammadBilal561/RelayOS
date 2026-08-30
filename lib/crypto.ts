import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const VERSION_PREFIX = "v1:";

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. Generate a 32-byte hex key (64 hex chars) and set it in your server environment."
    );
  }
  if (keyHex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(keyHex, "hex");
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encoded = Buffer.concat([iv, ciphertext, authTag]).toString("base64");
  return VERSION_PREFIX + encoded;
}

export function decryptToken(ciphertextB64: string): string {
  if (!ciphertextB64.startsWith(VERSION_PREFIX)) {
    throw new Error(`Unsupported or missing version prefix. Expected "${VERSION_PREFIX}".`);
  }

  const key = getEncryptionKey();
  const encoded = ciphertextB64.slice(VERSION_PREFIX.length);
  const data = Buffer.from(encoded, "base64");

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(VERSION_PREFIX);
}