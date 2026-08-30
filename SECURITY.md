# RelayOS Security Documentation

This document describes the security architecture and practices for RelayOS.

## Secret Handling

### Environment Variables

All secrets are stored in environment variables, never in code or Git:

| Variable | Purpose | Required | Notes |
|----------|---------|----------|-------|
| `SUPABASE_SECRET_KEY` | Service-role Supabase key | Yes | Server-only, bypasses RLS |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes | Server-only |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | Server-only |
| `ENCRYPTION_KEY` | AES-256-GCM key for token encryption | Yes | **Server-only, 32-byte hex (64 chars)** |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Production | For distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | Production | For distributed rate limiting |

### Client-Safe Variables (NEXT_PUBLIC_*)

Only these variables are exposed to the browser:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

**Never** prefix server-only secrets with `NEXT_PUBLIC_`.

### Key Generation

```bash
# Generate ENCRYPTION_KEY (32 bytes = 64 hex chars)
openssl rand -hex 32

# Generate webhook secret
openssl rand -hex 32
```

## Token Encryption (Google Calendar)

### Algorithm
- **AES-256-GCM** (authenticated encryption)
- 12-byte IV (random per encryption)
- 16-byte authentication tag

### Format (v1)
```
v1:<base64(IV || ciphertext || authTag)>
```
- Explicit version prefix `v1:` for unambiguous format detection
- IV (12 bytes) || ciphertext || authTag (16 bytes) concatenated and base64-encoded
- `isEncrypted()` checks for `v1:` prefix only — never uses length

### Implementation
- Encryption/decryption happens **server-side only** in `lib/crypto.ts`
- Tokens are encrypted before storage in `calendar_connections` table
- Existing plaintext tokens are detected via `isEncrypted()` (prefix check) and passed through unmodified on read
- The `ENCRYPTION_KEY` environment variable is required at runtime

### Migration Strategy
1. Deploy code with encryption enabled
2. New tokens are stored encrypted automatically with `v1:` prefix
3. Existing plaintext tokens are detected (no `v1:` prefix) and passed through unmodified on read
4. On token refresh, new tokens are stored encrypted with `v1:` prefix
5. **One-time backfill required** for full encryption of existing rows — see `scripts/backfill-encrypted-calendar-tokens.mjs`

### Legacy Plaintext Compatibility
- Plaintext tokens (no `v1:` prefix) are returned as-is — no decryption attempted
- Application code in `lib/google-calendar.ts` uses `isEncrypted()` to branch:
  ```typescript
  const accessToken = isEncrypted(connection.access_token)
    ? decryptToken(connection.access_token)
    : connection.access_token;
  ```
- This allows zero-downtime deployment — existing users keep working

### Backfill Procedure (One-time, Operator-initiated)
```bash
# 1. Ensure ENCRYPTION_KEY is set in .env.local
# 2. Run backfill script (safe to re-run)
node scripts/backfill-encrypted-calendar-tokens.mjs
```
- Script reads `.env.local`, uses service-role key
- Only updates rows where `access_token` or `refresh_token` lack `v1:` prefix
- Skips already-encrypted rows (idempotent)
- Prints counts only — never logs token values

### Security Properties
- Authenticated encryption prevents tampering
- Random IV per encryption prevents pattern analysis
- Key never exposed to client/browser
- No hardcoded fallback keys
- Decrypted tokens never logged

## Webhook Signature Model (n8n)

### Algorithm
- **HMAC-SHA256**
- Canonical string: `timestamp.nonce.raw_request_body`
- Signature format: `v1=<hex>`

### Headers Added to Webhook Requests
```
x-relayos-signature: v1=<hmac-sha256-hex>
x-relayos-timestamp: <unix-timestamp>
x-relayos-nonce: <16-byte-hex>
```

### Verification (n8n Side) — Implemented in workflow templates

All three workflow templates (`lead-qualified-notify.json`, `lead-escalated-alert.json`, `booking-created-confirmation.json`) include a **Verify RelayOS Signature** Code node that performs:

1. **Extract headers:** `x-relayos-signature`, `x-relayos-timestamp`, `x-relayos-nonce`
2. **Read exact raw request body:** `$request.rawBody` (NOT `JSON.stringify($json)`)
3. **Reject if any header missing**
4. **Reject if signature doesn't start with `v1=`**
5. **Parse timestamp safely** (Unix seconds)
6. **Reject if timestamp drift > 300 seconds (5 minutes)**
7. **Reconstruct canonical string exactly:** `${timestamp}.${nonce}.${rawBody}`
8. **Get per-business secret from n8n Credentials** (`$credentials.relayOsWebhookSecret`)
9. **Compute expected signature:** `v1=HMAC_SHA256(canonical, secret)`
10. **Compare using `crypto.timingSafeEqual()`** (timing-safe)
11. **Fail closed:** throw Error on any failure → workflow stops
12. **Pass through original payload unchanged** on success

### n8n Setup (Operator steps)

1. In n8n: **Settings → Credentials → New Credential** → select **Generic Credential**
2. Name: `RelayOS Webhook Secret - <Business Name>`
3. Add field: `secret` (String) — paste 64-char hex from RelayOS Settings → Automations
4. In each imported workflow: open **Verify RelayOS Signature** Code node → **Credentials** → select the credential
5. **Never hardcode secrets in workflow JSON**
6. **One secret per business** — each business needs its own workflow instance + credential

### Replay protection

- Timestamp tolerance: **5 minutes (300 seconds)**
- **No nonce deduplication** — same signed request could be replayed within 5-minute window
- For stronger protection, add external nonce tracking (Redis/DB) — not included in templates
- Do NOT claim stronger replay protection than implemented

### Configuration

- Each business has its own `n8n_webhook_secret` (stored in `businesses` table)
- If secret is null, webhooks are sent unsigned (not recommended for production)
- Secret generated with: `openssl rand -hex 32`

### Delivery Guarantees

- Events are always recorded in `automation_events` table first
- Webhook delivery is best-effort (never blocks widget response)
- Failed deliveries are recorded with `delivery_error`
- Events can be replayed from the dashboard

### What happens on verification failure

- Workflow execution stops immediately (fail closed)
- Error logged in n8n execution history
- No downstream Slack/email actions execute
- RelayOS records `delivery_error` in `automation_events` table

## Service-Role Boundary

### Principle
The service-role Supabase client (`createServiceRoleClient()`) bypasses Row Level Security and must only be used in trusted server code after authorization validation.

### Architecture
All service-role operations are centralized in `lib/server-data.ts` with explicit documentation:

```typescript
// lib/server-data.ts - Server-only privileged data access layer
// All functions here use the service-role client and BYPASS RLS.
// Callers MUST validate authorization before calling these functions.
// 
// Pattern:
// 1. Public endpoint validates widget key / user session → gets businessId
// 2. Public endpoint calls these functions with the validated businessId
// 3. These functions trust the businessId is authorized (enforced by caller)
```

### Authorization Boundaries

| Endpoint | Authorization | Service-Role Usage |
|----------|---------------|-------------------|
| `POST /api/widget/message` | Widget key validation | Via `server-data.ts` functions |
| `GET /widget/[widgetKey]` | Widget key validation | Via `server-data.ts` functions |
| `POST /api/v1/organizations/provision` | Authenticated user session | Direct (bootstrap only) |
| Dashboard APIs | User session + org membership | RLS-enforced (no service role) |

### Hardening Measures
1. **Centralized access layer** - All service-role DB operations in `server-data.ts`
2. **Explicit authorization comments** - Every function documents caller requirements
3. **No client imports** - `server-data.ts` is server-only (no `"use client"`)
4. **Business-scoped operations** - Functions accept `businessId` from validated context
5. **No general-purpose admin client exposure** - Functions are narrowly scoped

### Files Using Service Role (Audited)
- `lib/server-data.ts` - Centralized privileged operations
- `lib/google-calendar.ts` - Calendar token storage/retrieval (encrypted)
- `lib/automation-events.ts` - Event recording + webhook delivery (signed)
- `lib/rag/ingest.ts` - Knowledge base ingestion (dashboard only)
- `app/api/v1/organizations/provision/route.ts` - Bootstrap only (authenticated)

## Rate Limiting

### Production Requirement
**The in-memory rate limiter is NOT suitable for production multi-instance deployments.**

Each Vercel serverless instance has its own memory, so limits are not shared across instances.

### Backends

| Backend | Use Case | Configuration |
|---------|----------|---------------|
| `memory` | Development, single-instance demos | Default, no extra config |
| `upstash-redis` | Production (recommended) | `RATE_LIMITER_BACKEND=upstash-redis` + Upstash credentials |
| `custom` | Custom infrastructure | Implement in `createCustomRateLimiter()` |

### Configuration
```env
# Development (default)
RATE_LIMITER_BACKEND=memory
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=12

# Production
RATE_LIMITER_BACKEND=upstash-redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=12
```

### Upstash Setup (Free Tier)
1. Create account at https://upstash.com
2. Create a Redis database
3. Copy REST URL and token to environment variables
4. Set `RATE_LIMITER_BACKEND=upstash-redis`

### Widget Rate Limiting
- Key format: `widget:{widgetKey}`
- Default: 12 requests per 60 seconds per widget
- Returns 429 with `Too many messages — please wait a moment.`
- Rate limit info included in response for client handling

## Database Security

### Row Level Security (RLS)
All user-facing tables have RLS policies enforcing organization/business isolation:

```sql
-- Example: calendar_connections policy
create policy "org members can manage their calendar connection" on calendar_connections
  for all using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );
```

### Encrypted Columns
- `calendar_connections.access_token` - AES-256-GCM encrypted
- `calendar_connections.refresh_token` - AES-256-GCM encrypted
- `businesses.n8n_webhook_secret` - Plaintext (used for HMAC, not stored long-term in client-accessible context)

### Migration Safety
- No automatic data migrations in this package
- Schema changes are additive (new columns, new tables)
- Existing plaintext tokens handled transparently at read time

## Security Checklist for Deployment

- [ ] `ENCRYPTION_KEY` set in production environment (32-byte hex)
- [ ] `RATE_LIMITER_BACKEND=upstash-redis` configured for production
- [ ] Upstash Redis credentials configured
- [ ] `n8n_webhook_secret` generated and stored for each business
- [ ] n8n webhooks configured to verify signatures
- [ ] No `NEXT_PUBLIC_` prefixed server secrets
- [ ] `.env.local` not committed to Git
- [ ] `.claude/settings.local.json` and `.vscode/settings.local.json` gitignored
- [ ] Service-role key only in server environment, never in client bundles

## Incident Response

### If ENCRYPTION_KEY is Compromised
1. Rotate `ENCRYPTION_KEY` in environment
2. Re-encrypt all stored tokens (requires migration script)
3. Rotate Google OAuth credentials
4. Invalidate all calendar connections (users must reconnect)

### If Webhook Secret is Compromised
1. Generate new secret for affected business
2. Update n8n webhook configuration
3. Monitor for replayed requests (timestamp validation helps)

### If Service-Role Key is Compromised
1. Rotate Supabase service-role key in dashboard
2. Update `SUPABASE_SECRET_KEY` in environment
3. Audit recent privileged operations

## Testing Security Features

Run the security test suite:
```bash
npm test -- lib/crypto.test.ts lib/webhook-signing.test.ts lib/rate-limit.test.ts
```

Key test scenarios covered:
- Encrypt/decrypt round trip
- Invalid ciphertext rejection
- Wrong key rejection
- No plaintext in logs/ciphertext
- Valid/invalid signature verification
- Timestamp drift/replay protection
- Rate limit window expiry
- Independent key tracking