import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken, isEncrypted } from "@/lib/crypto";

describe("crypto", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe("encryptToken / decryptToken round trip", () => {
    it("encrypts and decrypts a token correctly", () => {
      const plaintext = "ya29.a0AfH6SMC...test_access_token";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts a refresh token correctly", () => {
      const plaintext = "1//0gX...test_refresh_token";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext for same plaintext (non-deterministic IV)", () => {
      const plaintext = "test_token";
      const encrypted1 = encryptToken(plaintext);
      const encrypted2 = encryptToken(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
      expect(decryptToken(encrypted1)).toBe(plaintext);
      expect(decryptToken(encrypted2)).toBe(plaintext);
    });

    it("handles empty string", () => {
      const encrypted = encryptToken("");
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe("");
    });

    it("handles long tokens", () => {
      const plaintext = "a".repeat(500);
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("encryption format v1", () => {
    it("outputs v1: prefix on encrypted tokens", () => {
      const encrypted = encryptToken("test_token");
      expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+$/);
    });

    it("decryptToken rejects missing version prefix", () => {
      const plaintext = "test_token";
      const encrypted = encryptToken(plaintext);
      const withoutPrefix = encrypted.slice(3); // remove "v1:"
      expect(() => decryptToken(withoutPrefix)).toThrow(/version prefix/);
    });

    it("decryptToken rejects unsupported version prefix", () => {
      expect(() => decryptToken("v2:abcdef")).toThrow(/version prefix/);
    });

    it("isEncrypted returns true for v1 ciphertext", () => {
      const encrypted = encryptToken("test_token");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("isEncrypted returns false for plaintext without prefix", () => {
      expect(isEncrypted("plaintext_token")).toBe(false);
    });

    it("isEncrypted returns false for long plaintext OAuth token (false positive prevention)", () => {
      const longPlaintext = "ya29.a0AfH6SMC12345678901234567890123456789012345678901234567890";
      expect(isEncrypted(longPlaintext)).toBe(false);
    });

    it("isEncrypted returns false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("isEncrypted returns true for any string with v1: prefix (prefix-only check)", () => {
      expect(isEncrypted("v1:not-base64!")).toBe(true);
      expect(isEncrypted("v1:")).toBe(true);
    });
  });

  describe("decryptToken error handling", () => {
    it("throws on invalid ciphertext (wrong key)", () => {
      const plaintext = "test_token";
      const encrypted = encryptToken(plaintext);

      process.env.ENCRYPTION_KEY = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

      expect(() => decryptToken(encrypted)).toThrow();
    });

    it("throws on corrupted ciphertext", () => {
      const encrypted = encryptToken("test_token");
      const corrupted = encrypted.slice(0, -1) + (encrypted.slice(-1) === "A" ? "B" : "A");
      expect(() => decryptToken(corrupted)).toThrow();
    });

    it("throws on truncated ciphertext", () => {
      const encrypted = encryptToken("test_token");
      const truncated = encrypted.slice(0, -10);
      expect(() => decryptToken(truncated)).toThrow();
    });

    it("throws on non-base64 input after prefix", () => {
      expect(() => decryptToken("v1:not-base64!")).toThrow();
    });

    it("throws when ENCRYPTION_KEY is not set", () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encryptToken("test")).toThrow(/ENCRYPTION_KEY/);
      expect(() => decryptToken("v1:dGVzdA==")).toThrow(/ENCRYPTION_KEY/);
    });

    it("throws when ENCRYPTION_KEY is wrong length", () => {
      process.env.ENCRYPTION_KEY = "short";
      expect(() => encryptToken("test")).toThrow(/64 hex characters/);
    });
  });

  describe("legacy plaintext compatibility", () => {
    it("plaintext tokens are detected as unencrypted", () => {
      const legacyToken = "ya29.a0AfH6SMC12345678901234567890123456789012345678901234567890";
      expect(isEncrypted(legacyToken)).toBe(false);
    });

    it("plaintext tokens can be encrypted and then decrypted", () => {
      const legacyToken = "ya29.a0AfH6SMC12345678901234567890123456789012345678901234567890";
      const encrypted = encryptToken(legacyToken);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(legacyToken);
    });
  });

  describe("no plaintext token logging", () => {
    it("does not expose plaintext in encrypted output", () => {
      const plaintext = "secret_token_123";
      const encrypted = encryptToken(plaintext);
      expect(encrypted).not.toContain(plaintext);
      expect(encrypted).not.toContain("secret");
      expect(encrypted).not.toContain("token");
    });
  });
});