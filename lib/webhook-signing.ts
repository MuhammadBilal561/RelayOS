import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const ALGORITHM = "sha256";
const SIGNATURE_HEADER = "x-relayos-signature";
const TIMESTAMP_HEADER = "x-relayos-timestamp";
const NONCE_HEADER = "x-relayos-nonce";
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

export interface WebhookSigningOptions {
  secret: string;
  payload: string;
  timestamp?: string;
  nonce?: string;
}

/**
 * Creates a canonical string to sign: timestamp + "." + nonce + "." + payload
 * This matches the format used by Stripe and other webhook providers.
 */
function createCanonicalString(timestamp: string, nonce: string, payload: string): string {
  return `${timestamp}.${nonce}.${payload}`;
}

export interface SignedWebhookResult {
  signature: string;
  timestamp: string;
  nonce: string;
}

/**
 * Generates an HMAC-SHA256 signature for a webhook request.
 * Returns the signature, timestamp, and nonce.
 */
export function signWebhookRequest({ secret, payload, timestamp, nonce }: WebhookSigningOptions): SignedWebhookResult {
  const ts = timestamp ?? Math.floor(Date.now() / 1000).toString();
  const nc = nonce ?? randomBytes(16).toString("hex");
  const canonical = createCanonicalString(ts, nc, payload);
  const hmac = createHmac(ALGORITHM, secret);
  hmac.update(canonical);
  return {
    signature: `v1=${hmac.digest("hex")}`,
    timestamp: ts,
    nonce: nc,
  };
}

/**
 * Verifies a webhook request signature.
 * Returns true if valid, false otherwise.
 */
export function verifyWebhookSignature(
  secret: string,
  payload: string,
  signature: string | null,
  timestamp: string | null,
  nonce: string | null
): { valid: boolean; error?: string } {
  if (!signature || !timestamp || !nonce) {
    return { valid: false, error: "Missing signature, timestamp, or nonce header" };
  }

  // Check timestamp drift to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(now - requestTime) > MAX_TIMESTAMP_DRIFT_MS / 1000) {
    return { valid: false, error: "Timestamp out of acceptable range" };
  }

  // Verify signature format
  if (!signature.startsWith("v1=")) {
    return { valid: false, error: "Invalid signature format" };
  }

  const expectedSignature = signWebhookRequest({
    secret,
    payload,
    timestamp,
    nonce,
  });

  // Use timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature.signature, "utf8");
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

/**
 * Extracts webhook signature headers from a fetch Request object.
 */
export function extractWebhookHeaders(request: Request): {
  signature: string | null;
  timestamp: string | null;
  nonce: string | null;
} {
  return {
    signature: request.headers.get(SIGNATURE_HEADER),
    timestamp: request.headers.get(TIMESTAMP_HEADER),
    nonce: request.headers.get(NONCE_HEADER),
  };
}