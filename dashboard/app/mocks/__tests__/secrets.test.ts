import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret, maskSecret } from "~/lib/security/secrets.server";

describe("secret helpers", () => {
  it("masks secrets by exposing only trailing characters", () => {
    expect(maskSecret("abcd1234")).toBe("••••1234");
  });

  it("handles empty strings gracefully", () => {
    expect(maskSecret("")).toBe("");
    expect(maskSecret(null)).toBe("");
  });

  it("round trips mock encryption", () => {
    const encrypted = encryptSecret("demo-token");
    expect(encrypted.startsWith("mock::")).toBe(true);
    expect(decryptSecret(encrypted)).toBe("demo-token");
  });
});
