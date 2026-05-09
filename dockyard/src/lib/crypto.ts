import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { getEncryptionSecret } from "@/lib/config";

const VERSION = "v1";

function getAesKey() {
  return createHash("sha256").update(getEncryptionSecret()).digest();
}

export function encryptValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getAesKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptValue(payload: string) {
  const [version, iv, tag, encrypted] = payload.split(":");

  if (version !== VERSION || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted payload format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getAesKey(),
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptJson(value: unknown) {
  return encryptValue(JSON.stringify(value));
}

export function decryptJson<T = unknown>(payload: string): T {
  return JSON.parse(decryptValue(payload)) as T;
}
