# RelayOS

**The Autonomous AI Front Office for Service Businesses.**

RelayOS turns a service business's website into a self-serve front office. An embeddable AI chat widget answers customer questions from the business's own knowledge base, captures lead information, checks live calendar availability, and books real appointments on Google Calendar — while scoring and prioritizing leads, generating handoff summaries for the team, and firing automation events into n8n. All of it is managed from a modern dashboard with real revenue-recovery analytics and agency-style multi-tenancy.

Everything runs on free tiers: **Vercel + Supabase (Postgres, pgvector, Auth) + the Gemini API free tier + the Google Calendar API free tier + self-hosted n8n Community Edition.**

---

## Features

- **Embeddable AI chat widget** — a small, brandable iframe widget that drops onto any client website and talks to customers in natural language.
- **RAG over the business's knowledge base** — documents are chunked, embedded, and semantically retrieved so answers are grounded in real business facts.
- **Tool-calling agent** — captures contact details, checks availability, and creates real Google Calendar bookings directly from the conversation.
- **Lead scoring** — every message is scored on contact info, urgency language, and engagement depth, so hot leads surface first.
- **Human handoff** — customers can escalate to a real person; the agent generates an AI conversation summary for the team (optionally pushed to Slack via n8n).
- **Automation engine** — events fire into self-hosted n8n workflows (booking confirmed, lead qualified, lead escalated) with deliverable tracking.
- **Revenue-recovery analytics** — live funnel, average response time, and revenue recovered based on real bookings and lead values.
- **Agency mode** — manage multiple client businesses under one account, each fully isolated by Row Level Security with its own widget, knowledge base, calendar, and analytics.
- **Security defaults** — rate-limited API routes, AES-256-GCM encryption for OAuth tokens at rest, signed webhook payloads, and strict Row Level Security.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS, custom design system, Recharts |
| Backend | Next.js API routes (`/api/...`) |
| Database | Supabase (PostgreSQL, pgvector, Row Level Security) |
| AI | Gemini API (chat + embeddings), RAG |
| Calendar | Google Calendar API (OAuth 2.0) |
| Automation | Self-hosted n8n (Docker) |
| Testing | Vitest (unit) + GitHub Actions CI |

## Getting started

### 1. Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project
- A free [Gemini API key](https://aistudio.google.com/apikey)
- (Optional) A Google Cloud project with the **Google Calendar API** enabled
- (Optional) [Docker](https://docs.docker.com/get-docker/) for local n8n

### 2. Set up the database

1. Create a Supabase project (free tier).
2. In **SQL Editor**, run the migrations in `supabase/migrations/` **in order** (e.g. `0001_init.sql`, `0002_bookings.sql`, `0003_lead_scoring.sql`, `0004_automation_events.sql`, ...). These create the schema, enable `pgvector`, configure Row Level Security, and seed a demo business ("Aurora HVAC & Air").
3. In **Authentication → Providers → Email**, turn off "Confirm email" for local testing so signup logs you in immediately. Turn it back on before production.
4. Copy your **Project URL**, **anon public key**, and **service_role key** from Project Settings → API.

### 3. Configure Google Calendar (optional, for bookings)

1. In the [Google Cloud Console](https://console.cloud.google.com), enable the **Google Calendar API**.
2. Configure the **OAuth consent screen** (External is fine for testing — add yourself as a test user).
3. Under **Credentials → Create Credentials → OAuth client ID**, choose "Web application" and add `http://localhost:3000/api/integrations/google-calendar/callback` as an authorized redirect URI.
4. Copy the generated **Client ID** and **Client Secret**.

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in every value from the previous steps. See `.env.example` for inline guidance on each variable.

### 5. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Testing

```bash
npm run typecheck    # TypeScript, no emit
npm run test         # unit tests (vitest)
npm run test:watch   # unit tests, watch mode
npm run test:coverage
```

The suite covers the parts of the app where a silent bug would actually cost a client money or trust: lead scoring, the RAG chunker, the rate limiter, the system prompt builder, the automation event emitter, the revenue/response-time/funnel math, and the agent's tool-execution layer. External services (Supabase, Google Calendar, Gemini) are mocked at the module boundary, so tests run instantly with no live credentials.

`.github/workflows/ci.yml` runs typecheck → tests → a full `next build` on every push and pull request to `main`, using placeholder env vars so the build can be analyzed statically — no real secrets ever touch CI.

## Project structure

```
app/
  (auth)/                 login, signup
  (dashboard)/            overview, inbox, leads, bookings, knowledge-base, analytics, settings
  api/widget/message      public AI chat endpoint (RAG + tool-calling agent)
  api/v1/...              authenticated dashboard endpoints (incl. multi-business switch/create)
  api/integrations/       Google Calendar OAuth connect/callback
  widget/[widgetKey]      the iframe page the embed snippet loads on client sites
components/
  ui/                     design-system primitives (button, card, input, tooltip, ...)
  dashboard/              sidebar, forms, charts, cards
  widget/                 chat widget + embeddable frame
  auth/                   auth pages
  landing/                public marketing page
lib/
  ai/                     Gemini client, system prompt, tool declarations, agent loop, summarizer
  rag/                    chunking, embedding/ingestion, semantic retrieval
  google-calendar.ts      OAuth, availability checks, event creation
  scoring.ts              deterministic lead scoring
  automation-events.ts    records + delivers events to n8n
  analytics.ts            revenue/response-time/funnel calculations
  current-business.ts     agency-mode business resolution + switcher data
  supabase/               browser / server / service-role clients
  format.ts               shared display formatting
automations/              importable n8n workflow templates (booking confirmed, lead qualified, lead escalated)
supabase/migrations/      schema as SQL
public/embed.js           the vanilla-JS snippet businesses paste on their site
docker-compose.yml        self-hosted n8n for local dev / a free-tier VM
scripts/                  maintenance scripts (e.g. calendar token backfill)
```

## Embedding the widget

From **Settings**, copy the embed snippet (or the widget URL `https://<your-app>/widget/<widget-key>`). Paste the snippet into any website — it loads a branded iframe chat that works without any API keys on the client side.

## Automations with n8n (optional)

1. Start n8n: `docker compose up -d` and open `http://localhost:5678`.
2. Import the starter workflows from `automations/*.json` (Workflows → Import from File).
3. Activate each workflow, copy its Webhook Production URL, and paste it into **Settings → Automations** for your business.

The `automations/*.json` files include ready-to-import Slack notifications and booking/lead workflows.

## Deploying for free

- **App:** push this repo to GitHub and import it on [Vercel](https://vercel.com) (Hobby plan). Add the same environment variables, set `NEXT_PUBLIC_APP_URL` to your Vercel URL, and add that URL as an authorized redirect URI on your Google OAuth client.
- **Database:** already on Supabase's free tier. Note that free projects pause after ~7 days of inactivity; ping any endpoint periodically to keep a live demo warm.
- **Automation:** self-host n8n Community Edition (the included `docker-compose.yml`) on a free-tier VM (e.g. an Oracle Cloud "Always Free" ARM instance) to avoid n8n Cloud's paid execution limits.

## Security

- All authenticated API routes enforce session auth and Row Level Security per tenant.
- OAuth tokens are encrypted at rest with AES-256-GCM (`ENCRYPTION_KEY`).
- Public endpoints are rate-limited; the rate limiter supports an Upstash Redis backend for production.
- Webhook payloads are HMAC-signed with a per-tenant secret so n8n can verify the sender.
- Secret keys live only in server-side env vars or the deployment platform — never in the client bundle or the repository.
