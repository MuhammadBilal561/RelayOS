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
5. Click **Active** to turn the workflow on.
6. Paste the webhook's Production URL into RelayOS's Settings page for that business.

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

Building your own workflow (nurture sequences, review requests, weekly
digests)? Point a new Webhook node at whichever event type you need and
build from there — `lib/automation-events.ts` is the one place in the app
that emits these, so adding a new trigger point is a one-line addition.
