import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type SealedValue = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function decodeKey(encoded: string) {
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) {
    throw new Error("BASECAMP_SESSION_KEY must be a base64url-encoded 32-byte key.");
  }
  return key;
}

export function sealString(value: string, encodedKey: string): SealedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  };
}

export function openString(value: SealedValue, encodedKey: string): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    decodeKey(encodedKey),
    Buffer.from(value.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
