# RelayOS n8n workflows

These three exports are event-specific workflows:

| File | Event | Payload fields used |
| --- | --- | --- |
| `lead-qualified-notify.json` | `lead.qualified` | `payload.email`, `payload.phone`, `payload.service_interest` |
| `lead-escalated-alert.json` | `lead.escalated` | `payload.reason`, `payload.summary`, `payload.conversationId` |
| `booking-created-confirmation.json` | `booking.created` | `payload.summary`, `payload.startIso`, `payload.leadEmail` |

## Secure setup

1. Apply the Supabase migrations through `0011_reliability_constraints.sql`.
2. Import all three workflow JSON files. Activate each workflow and copy its
   n8n **Production URL** into the matching RelayOS field:
   `lead.qualified` → Lead Qualified, `lead.escalated` → Lead Escalated, and
   `booking.created` → Booking Created. Do not use n8n's Test URL in Vercel.
3. Set one random value of at least 32 characters as the webhook signing secret
   in RelayOS. The field is write-only; do not paste the secret into a workflow
   export or commit it to this repository.
4. Set the same value as `RELAYOS_WEBHOOK_SECRET` in the n8n host environment.
   With Docker Compose, create a `.env` file beside `docker-compose.yml`, add
   `RELAYOS_WEBHOOK_SECRET=<random-32-byte-value>`, and run `docker compose up -d`
   again. Do not put the value in a workflow field or JSON export. The verifier
   reads it through n8n's supported `$env` Code-node variable; do not use
   `$request` or `$credentials` in the Code node. The compose file also enables
   the `crypto` built-in.
5. Keep each Webhook node's **Raw Body** option enabled. The verifier signs the
   exact compact JSON body sent by RelayOS, not a re-serialized `$json` object.

The verifier reads headers from `item.json.headers` and the exact raw request
bytes from `item.binary.data.data` (base64 decoded). The Webhook node's **Raw
Body** option is mandatory; if n8n does not provide that binary field,
verification fails rather than serializing `body`. The
verifier checks the `v1=` HMAC-SHA256 signature and enforces a five-minute
timestamp window. RelayOS signs:

```text
timestamp + "." + nonce + "." + raw request body
```

RelayOS sends an unsigned request only when no secret is configured. Do not use
that mode in production. A single n8n host-wide secret can be shared by the
businesses it serves; if businesses require different secrets, run separate
n8n hosts or create separate deployments with their own environment variable.

## Slack and email actions

The Slack URL, Resend authorization value, sender domain, and recipient
settings in the exports are placeholders. Before activation, replace them
with n8n credentials or environment-backed values, verify the Slack channel,
and verify the Resend domain/sender. The booking workflow sends the customer
email from the `leadEmail` payload field. Never commit real Slack, Resend,
Google, Supabase, or webhook secrets to workflow JSON.

## Testing

Use n8n's Test URL only while the workflow is listening and use a temporary
RelayOS webhook URL for local testing. For production, activate the workflow,
save its Production URL in RelayOS, send a real lead/booking event, and inspect
the n8n execution. Invalid, missing, or older-than-five-minutes signatures
must fail at **Verify RelayOS Signature**.
