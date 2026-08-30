import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signWebhookRequest, verifyWebhookSignature, extractWebhookHeaders } from "@/lib/webhook-signing";

describe("webhook-signing", () => {
  const secret = "test-secret-key-123456789012345678901234"; // 32 chars

  describe("signWebhookRequest", () => {
    it("generates a signature with timestamp and nonce", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified", business_id: "biz_1" });
      const result = signWebhookRequest({ secret, payload });

      expect(result.signature).toMatch(/^v1=[a-f0-9]{64}$/);
      expect(result.timestamp).toMatch(/^\d+$/);
      expect(result.nonce).toMatch(/^[a-f0-9]{32}$/);
    });

    it("produces different signatures for same payload (nonce varies)", () => {
      const payload = JSON.stringify({ test: "data" });
      const sig1 = signWebhookRequest({ secret, payload });
      const sig2 = signWebhookRequest({ secret, payload });

      expect(sig1.signature).not.toBe(sig2.signature);
      expect(sig1.nonce).not.toBe(sig2.nonce);
    });

    it("uses provided timestamp and nonce when given", () => {
      const payload = JSON.stringify({ test: "data" });
      const timestamp = "1700000000";
      const nonce = "abcdef1234567890abcdef1234567890";

      const result = signWebhookRequest({ secret, payload, timestamp, nonce });

      expect(result.timestamp).toBe(timestamp);
      expect(result.nonce).toBe(nonce);
    });

    it("produces deterministic signature with same inputs", () => {
      const payload = JSON.stringify({ test: "data" });
      const timestamp = "1700000000";
      const nonce = "abcdef1234567890abcdef1234567890";

      const result1 = signWebhookRequest({ secret, payload, timestamp, nonce });
      const result2 = signWebhookRequest({ secret, payload, timestamp, nonce });

      expect(result1.signature).toBe(result2.signature);
    });
  });

  describe("verifyWebhookSignature", () => {
    it("validates a correct signature", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified", business_id: "biz_1" });
      const { signature, timestamp, nonce } = signWebhookRequest({ secret, payload });

      const result = verifyWebhookSignature(secret, payload, signature, timestamp, nonce);

      expect(result.valid).toBe(true);
    });

    it("rejects signature with wrong secret", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { signature, timestamp, nonce } = signWebhookRequest({ secret, payload });

      const result = verifyWebhookSignature("wrong-secret", payload, signature, timestamp, nonce);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("rejects signature with modified payload", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified", business_id: "biz_1" });
      const { signature, timestamp, nonce } = signWebhookRequest({ secret, payload });

      const modifiedPayload = JSON.stringify({ event_type: "lead.qualified", business_id: "biz_2" });
      const result = verifyWebhookSignature(secret, modifiedPayload, signature, timestamp, nonce);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("rejects expired timestamp (replay protection)", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { signature, nonce } = signWebhookRequest({ secret, payload });
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 minutes ago

      const result = verifyWebhookSignature(secret, payload, signature, oldTimestamp, nonce);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Timestamp out of acceptable range");
    });

    it("rejects future timestamp (replay protection)", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { signature, nonce } = signWebhookRequest({ secret, payload });
      const futureTimestamp = (Math.floor(Date.now() / 1000) + 600).toString(); // 10 minutes in future

      const result = verifyWebhookSignature(secret, payload, signature, futureTimestamp, nonce);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Timestamp out of acceptable range");
    });

    it("rejects missing signature header", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { timestamp, nonce } = signWebhookRequest({ secret, payload });

      const result = verifyWebhookSignature(secret, payload, null, timestamp, nonce);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing signature, timestamp, or nonce header");
    });

    it("rejects missing timestamp header", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { signature, nonce } = signWebhookRequest({ secret, payload });

      const result = verifyWebhookSignature(secret, payload, signature, null, nonce);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing signature, timestamp, or nonce header");
    });

    it("rejects missing nonce header", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { signature, timestamp } = signWebhookRequest({ secret, payload });

      const result = verifyWebhookSignature(secret, payload, signature, timestamp, null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing signature, timestamp, or nonce header");
    });

    it("rejects invalid signature format", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { timestamp, nonce } = signWebhookRequest({ secret, payload });

      const result = verifyWebhookSignature(secret, payload, "invalid-format", timestamp, nonce);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature format");
    });
  });

  describe("extractWebhookHeaders", () => {
    it("extracts signature, timestamp, and nonce from request headers", () => {
      const payload = JSON.stringify({ event_type: "lead.qualified" });
      const { signature, timestamp, nonce } = signWebhookRequest({ secret, payload });

      const request = new Request("https://example.com/webhook", {
        method: "POST",
        headers: {
          "x-relayos-signature": signature,
          "x-relayos-timestamp": timestamp,
          "x-relayos-nonce": nonce,
        },
      });

      const headers = extractWebhookHeaders(request);

      expect(headers.signature).toBe(signature);
      expect(headers.timestamp).toBe(timestamp);
      expect(headers.nonce).toBe(nonce);
    });

    it("returns null for missing headers", () => {
      const request = new Request("https://example.com/webhook", { method: "POST" });

      const headers = extractWebhookHeaders(request);

      expect(headers.signature).toBeNull();
      expect(headers.timestamp).toBeNull();
      expect(headers.nonce).toBeNull();
    });
  });
});