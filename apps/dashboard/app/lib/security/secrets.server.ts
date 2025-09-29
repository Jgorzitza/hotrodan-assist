import crypto from "node:crypto";

const ENCRYPTION_PREFIX = "mock::";

/**
 * NOTE: These helpers provide a mock encryption strategy. Replace with Shopify
 * hosted secret storage + KMS (AWS/GCP) and add audit logging when secrets are
 * rotated or accessed in production.
 */
export const encryptSecret = (secret: string): string => {
  if (!secret) {
    throw new Error("Secret payload must be provided for encryption");
  }

  const iv = crypto.randomBytes(12).toString("base64");
  const payload = Buffer.from(secret, "utf-8").toString("base64");
  return `${ENCRYPTION_PREFIX}${iv}:${payload}`;
};

export const decryptSecret = (encrypted: string | null): string | null => {
  if (!encrypted) {
    return null;
  }

  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    throw new Error("Unexpected secret format");
  }

  const encoded = encrypted.slice(ENCRYPTION_PREFIX.length);
  const parts = encoded.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid secret payload");
  }

  const [, payload] = parts;
  return Buffer.from(payload, "base64").toString("utf-8");
};

export const maskSecret = (secret: string | null, visibleChars = 4): string => {
  if (!secret) {
    return "";
  }

  const trimmed = secret.trim();
  if (!trimmed) {
    return "";
  }

  const visible = trimmed.slice(-visibleChars);
  return `••••${visible}`;
};
