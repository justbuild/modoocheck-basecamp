import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { openString, sealString } from "./crypto";

describe("owner session encryption", () => {
  it("round-trips an owner token without retaining plaintext", () => {
    const key = randomBytes(32).toString("base64url");
    const token = "owner.jwt.token";
    const sealed = sealString(token, key);
    expect(sealed.ciphertext).not.toContain(token);
    expect(openString(sealed, key)).toBe(token);
  });

  it("rejects decryption with a different key", () => {
    const sealed = sealString("sensitive-token", randomBytes(32).toString("base64url"));
    expect(() => openString(sealed, randomBytes(32).toString("base64url"))).toThrow();
  });

  it("requires exactly 32 bytes of key material", () => {
    expect(() => sealString("token", randomBytes(16).toString("base64url"))).toThrow(/32-byte/);
  });
});
