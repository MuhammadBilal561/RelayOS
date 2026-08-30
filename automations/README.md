# RelayOS automation templates (n8n)

These are the workflows that turn RelayOS's `automation_events` into real
Slack alerts and emails. Each one starts with a Webhook node — that
webhook's URL is what you paste into RelayOS's **Settings → Automations**
field.

## Import steps

1. Start n8n (`docker compose up -d` from the repo root, or n8n Cloud if you prefer a paid managed option).
2. In n8n: **Workflows → Import from File** → pick one of the `.json` files here.
3. Open the imported workflow's **Webhook** node → copy its **Production URL**.
4. Replace the placeholder Slack webhook URL (`https://hooks.slack.com/services/REPLACE/...`) — get a real one free from [Slack's Incoming Webhooks app](https://api.slack.com/messaging/webhooks) for your workspace. For the booking-confirmation workflow, also replace the Resend API key placeholder.
5. **Create and attach the per-business webhook signing credential:**
   - In n8n: **Settings → Credentials → New Credential** → select **Generic Credential** (or "Header Auth" if available)
   - Name: `RelayOS Webhook Secret - <Business Name>`
   - Add field: `secret` (type: String) — paste the 64-character hex secret from RelayOS Settings → Automations
   - Save
   - In each imported workflow: open the **Verify RelayOS Signature** Code node → **Credentials** → select the credential you just created
6. Click **Active** to turn the workflow on.
7. Paste the webhook's Production URL into RelayOS's Settings page for that business.

You may see a "this node uses a deprecated version" notice on import —
that's normal for hand-authored templates and n8n will offer to update it
in one click.

## What's here

| File | Fires on | What it does |
|---|---|---|
| `lead-qualified-notify.json` | `lead.qualified` | Slacks the owner the moment a visitor's contact info is captured for the first time |
| `lead-escalated-alert.json` | `lead.escalated` | Slacks the owner immediately when the AI hands off to a human, including the AI-generated summary |
| `booking-created-confirmation.json` | `booking.created` | Slacks the owner **and** emails the visitor a confirmation, in parallel |

## The event envelope every workflow receives

```json
{
  "event_type": "lead.qualified",
  "business_id": "uuid",
  "payload": { "...": "varies by event_type — see lib/ai/tools.ts" },
  "occurred_at": "2026-08-01T12:00:00.000Z"
}
```

## Webhook signature verification

All three workflows now include a **Verify RelayOS Signature** Code node immediately after the Webhook trigger. This node validates that the request came from RelayOS and has not been tampered with.

### Required headers (sent by RelayOS)

- `x-relayos-signature` — `v1=<HMAC-SHA256>`
- `x-relayos-timestamp` — Unix timestamp (seconds)
- `x-relayos-nonce` — 16-byte hex random value

### Verification algorithm

1. Read headers: `x-relayos-signature`, `x-relayos-timestamp`, `x-relayos-nonce`
2. Read exact raw request body: `$request.rawBody`
3. Reject if any header is missing
4. Reject if signature does not start with `v1=`
5. Parse timestamp (Unix seconds)
5. Reject if timestamp differs from current time by more than **300 seconds (5 minutes)**
6. Reconstruct canonical string **exactly**:  
   `${timestamp}.${nonce}.${rawBody}`
7. Compute expected signature:  
   `v1=HMAC_SHA256(canonical, secret)`  
   (secret from n8n Credentials)
8. Compare using `crypto.timingSafeEqual()` to prevent timing attacks
9. On failure: throw Error → workflow stops (fail closed)
10. On success: pass original webhook JSON through unchanged

### Secret management

- **One secret per business** — stored in `businesses.n8n_webhook_secret` in RelayOS
- In n8n: create a **Generic Credential** named `RelayOS Webhook Secret - <Business Name>`
- Field: `secret` (64-character hex string from RelayOS Settings)
- **Never hardcode secrets in workflow JSON**
- Each business must have its own n8n workflow instance with its own credential

### Replay protection

- Timestamp tolerance: **5 minutes (300 seconds)**
- **No nonce deduplication** — the same signed request could theoretically be replayed within the 5-minute window
- For stronger protection, add external nonce tracking (Redis/DB) — not included in these templates

### What happens on verification failure

- Workflow execution stops immediately
- Error logged in n8n execution history
- No Slack/email actions execute
- RelayOS records `delivery_error` in `automation_events` table

### Building your own workflow

Point a new Webhook node at whichever event type you need and
build from there — `lib/automation-events.ts` is the one place in the app
that emits these, so adding a new trigger point is a one-line addition.
