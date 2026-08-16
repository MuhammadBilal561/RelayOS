# RelayOS — Phase 0 through 5 (feature-complete against the original blueprint)

**The Autonomous AI Front Office for Service Businesses.**

This is the full working build of the RelayOS product blueprint: authentication, an embeddable AI chat widget grounded in a business's own knowledge base (RAG), a tool-calling agent that captures lead info, checks calendar availability, books real appointments on Google Calendar, scores and prioritizes leads, summarizes conversations for human handoff, escalates when needed, fires real automation events into n8n, and reports actual revenue-recovery analytics — plus a dashboard to see it all happen live, agency-mode multi-tenancy, a real unit test suite, and CI.

Everything here runs on free tiers: **Vercel + Supabase (Postgres/pgvector/Auth) + the Gemini API free tier + the Google Calendar API free tier + self-hosted n8n Community Edition.**

## 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier).
2. In **SQL Editor**, paste and run these migrations **in order**: `0001_init.sql`, `0002_bookings.sql`, `0003_lead_scoring.sql`, `0004_automation_events.sql`, `0005_analytics_and_agency.sql`. Together these create the schema, enable `pgvector`, set up Row Level Security, and seed one demo business ("Aurora HVAC & Air").
3. In **Authentication → Providers → Email**, turn **off** "Confirm email" for local testing (so signup logs you in immediately instead of waiting on an email link). Turn it back on before giving this to a real client.
4. Copy your **Project URL**, **anon public key**, and **service_role key** from Project Settings → API.

## 2. Get a free Gemini API key

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create a key — no credit card required. This project defaults to `gemini-2.5-flash-lite`, the model with the most generous free-tier rate limits as of 2026.

## 3. Set up Google Calendar booking (free)

1. In the [Google Cloud Console](https://console.cloud.google.com), create a project (or reuse one) and enable the **Google Calendar API** (APIs & Services → Library).
2. Configure the **OAuth consent screen** (External is fine for testing — add yourself as a test user so you don't need Google's app-verification review).
3. Under **Credentials → Create Credentials → OAuth client ID**, choose "Web application" and add `http://localhost:3000/api/integrations/google-calendar/callback` as an authorized redirect URI.
4. Copy the generated **Client ID** and **Client Secret**.

## 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values from steps 1–3.

## 5. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 6. Set up automation (n8n, free, optional but recommended)

1. Install [Docker](https://docs.docker.com/get-docker/) if you don't have it, then from the repo root:
   ```bash
   docker compose up -d
   ```
2. Open `http://localhost:5678` and create your n8n owner account.
3. Import the three starter workflows in `automations/*.json` (Workflows → Import from File) — see `automations/README.md` for the full walkthrough, including where to plug in a free Slack Incoming Webhook URL.
4. Activate each workflow, copy its Webhook Production URL, and paste it into RelayOS's **Settings → Automations** field for your business.

For an always-on deployment instead of running this on your laptop, run the same `docker-compose.yml` on a free-tier VM — an Oracle Cloud "Always Free" ARM instance avoids n8n Cloud's paid execution limits entirely.

## 7. Try it end-to-end

1. Go to `/signup` and create an account (this provisions your organization + first business).
2. Go to **Settings** and click **Connect** under Google Calendar — approve the consent screen. Paste your n8n webhook URL if you set that up.
3. Go to **Knowledge Base** and add a document — or just re-save the seeded "Services & Pricing" content so it actually gets embedded (the SQL seed inserts the document row, but embeddings require calling the ingestion API, which happens automatically the first time you save it through the dashboard).
4. Open `/widget/<your-widget-key>` (also linked from Settings) to talk to your AI.
5. Ask it something covered in your knowledge base, then ask to book an appointment for a specific day/time. Watch it check availability, confirm, and create a real Google Calendar event — then check **Bookings** in the dashboard, and your Slack channel if n8n is wired up.
6. Check **Leads** — the lead's score updates after every message based on contact info captured, urgency language, and engagement depth. Try something urgent ("my AC is broken, I need someone today") and watch the score jump.
7. Ask the widget to talk to a real person — it calls `escalate_to_human`, which generates an AI summary of the conversation and (if configured) Slacks it to you immediately. Open that conversation in **Inbox** to see the summary.
8. Go to **Settings → Branding & revenue** and set an "average value of a booked job" — then check **Analytics**: the funnel, average response time, and "Revenue recovered" are all computed live from what you just did.
9. Still in **Settings**, use **Agency mode — add another business** to create a second client business. Use the business switcher at the top of the sidebar to flip between them — each has its own widget key, knowledge base, calendar connection, and analytics, isolated by Row Level Security.

## Testing

```bash
npm run typecheck   # TypeScript, no emit
npm run test        # unit tests (vitest)
npm run test:watch  # unit tests, watch mode
npm run test:coverage
```

The suite covers the parts of the app where a silent bug would actually cost
a client money or trust: lead scoring (`lib/scoring.test.ts`), the RAG
chunker (`lib/rag/ingest.test.ts`), the rate limiter (`lib/rate-limit.test.ts`),
the system prompt builder (`lib/ai/prompts.test.ts`), the automation event
emitter (`lib/automation-events.test.ts`), the revenue/response-time/funnel
math (`lib/analytics.test.ts`), and — most importantly — the agent's
tool-execution layer (`lib/ai/tools.test.ts`), which is the single place
the AI's decisions turn into real database writes and calendar events.
External services (Supabase, Google Calendar, Gemini) are mocked at the
module boundary so these run instantly with no live credentials.

One real bug these tests caught during development: the urgency detector
only matched the exact phrase "smells like gas," missing the far more
common "I smell gas" — a safety-critical phrase for an HVAC business. Fixed
in `lib/scoring.ts` once the test exposed it.

`.github/workflows/ci.yml` runs typecheck → tests → a full `next build` on
every push and pull request to `main`, using placeholder env vars purely so
the build step can statically analyze pages — no real secrets touch CI.

## Project structure

See the full architecture write-up in the product blueprint document (`RelayOS_Product_Blueprint.md`) for the original database design and API design reference. Quick orientation:

```
app/
  (auth)/            login, signup
  (dashboard)/        overview, inbox, leads, bookings, knowledge-base, analytics, settings
  api/widget/message   the public AI chat endpoint (RAG + tool-calling agent)
  api/v1/...           authenticated dashboard endpoints (incl. multi-business switch/create)
  api/integrations/    Google Calendar OAuth connect/callback
  widget/[widgetKey]   the iframe page embed.js injects on client sites
lib/
  ai/                 Gemini client, system prompt, tool declarations, agent loop, summarizer
  rag/                chunking, embedding/ingestion, semantic retrieval
  google-calendar.ts   OAuth, availability checks, event creation
  scoring.ts           deterministic lead scoring
  automation-events.ts  records + delivers events to n8n
  analytics.ts          revenue/response-time/funnel calculations
  current-business.ts   agency-mode business resolution + switcher data
  supabase/            browser / server / service-role clients
  *.test.ts            unit tests live next to the code they test
automations/            importable n8n workflow templates + their README
supabase/migrations/    schema as SQL
public/embed.js         the vanilla-JS snippet businesses paste on their site
docker-compose.yml      self-hosted n8n for local dev / a free-tier VM
.github/workflows/ci.yml typecheck + test + build on every push
```

## Deploying for free

- **App:** push this repo to GitHub, then import it on [vercel.com](https://vercel.com) (Hobby/free plan) and add the same environment variables there. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL, and update the Google OAuth client's authorized redirect URI to match.
- **Database:** already on Supabase's free tier — note free projects pause after ~7 days of inactivity; ping any endpoint periodically (e.g. a free GitHub Actions cron) to keep a live demo warm.
- **Automation:** self-host n8n Community Edition (the `docker-compose.yml` here) on an Oracle Cloud "Always Free" ARM VM to avoid n8n Cloud's paid execution limits.

## Where this stands against the original blueprint

Every phase in the original product blueprint (`RelayOS_Product_Blueprint.md`) is now implemented: the AI front office, booking, lead intelligence, automation, analytics, and agency multi-tenancy. What's genuinely left for a real client engagement rather than a portfolio build: encrypting calendar tokens at rest (flagged in `0002_bookings.sql`), true white-label theming beyond a brand color (custom domains per client, logo upload), and a proper background job queue for automation delivery retries instead of the current best-effort inline attempt.

