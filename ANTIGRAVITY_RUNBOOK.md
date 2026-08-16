# RelayOS — Agent Build, Verification & Hardening Runbook

**Audience:** an autonomous coding agent (e.g. Google Antigravity) operating on this repository, working alongside the human project owner.

**Where to put this file:** the root of the `relay-os` project, next to `package.json`. When you open the project in Antigravity, point the agent at this file first and tell it: *"Read and execute this runbook phase by phase. Report status after each phase before moving to the next."*

---

## 0. Operating rules — read this before touching anything

These are not suggestions. Follow them in order, every time.

1. **Work phase by phase, in the order below.** Don't skip ahead because a later phase looks more interesting or more broken — most later-phase failures are actually caused by an unresolved earlier-phase issue.
2. **Every phase has a literal command and an literal expected result.** Run the command for real. Read the actual output. Do not assume, summarize from memory, or mark something passing because it "should" work.
3. **If a phase's actual result doesn't match the expected result, stop.** Go to that phase's "If this fails" guidance before moving on. Do not proceed to the next phase on top of an unresolved failure — you will waste time debugging Phase 4 when the real bug is sitting unresolved in Phase 1.
4. **The database already exists and may contain real data.** Never run a destructive command — `DROP TABLE`, `TRUNCATE`, `supabase db reset`, or re-running a migration that isn't idempotent — without explicit confirmation from the human first. Phase 2 below is deliberately read-only reconnaissance for exactly this reason.
5. **After each phase, report back in this exact format** before continuing:
   ```
   Phase N — [name]: PASS / FAIL
   Checked: <what you ran/verified>
   Found: <what the actual state was>
   Fixed: <what you changed, if anything, and why>
   Remaining: <anything still open>
   ```
6. **Backend correctness (Phases 0–8) is the priority.** Frontend adjustments (Phase 9) come only after every backend phase reports PASS — not before, even if frontend issues are visually obvious and tempting to fix first.
7. **When you fix a bug, also ask: does an automated test exist that would have caught this?** If not, write one before moving on (see Phase 8). A fix without a regression test is only half done in this codebase.

---

## 1. What this project actually is

RelayOS is an AI front-office platform for service businesses (HVAC, dental, law, real estate, salons, etc.): an embeddable chat widget that answers visitor questions grounded in that business's own knowledge base (RAG — it must refuse to answer from general knowledge, only from ingested content), a tool-calling AI agent that can actually *act* (capture lead contact info, check calendar availability, book real Google Calendar events, escalate to a human with an AI-written summary), deterministic lead scoring, n8n automation webhooks, a revenue-recovery analytics dashboard, and multi-tenant "agency mode" (one login, several client businesses).

**Why each major piece of the stack exists — understand this before changing anything:**

| Piece | Why it's here |
|---|---|
| Next.js 14 App Router | Frontend + API routes in one deployable unit, free hosting on Vercel |
| Supabase (Postgres + `pgvector` + Auth) | Real Postgres with vector search built in; Row Level Security enforces tenant isolation *at the database layer*, not just in application code — this matters a lot for a multi-tenant product |
| Google Gemini API (`gemini-2.5-flash-lite` chat, `gemini-embedding-001` embeddings) | Free-tier LLM with function-calling support for the tool-calling agent |
| Google Calendar API | Real booking, not a simulated calendar |
| n8n (self-hosted) | Visual, editable automation — a business owner can see and tweak workflow logic without a developer |
| Vercel | Free hosting for the Next.js app |

**Full reference docs already in this repo/project:** `README.md` (human-facing setup instructions) and, if the human has shared it, `RelayOS_Product_Blueprint.md` (the original product design doc). This runbook is the operative document for you as the agent — read the others for extra context if something here is ambiguous, but this file's instructions take precedence for what to actually *do*.

---

## 2. Known issues log — read this before debugging anything from scratch

Four real issues were already found and fixed once during development. If something looks broken, check here first — it may be a regression of one of these rather than a new bug.

### 2.1 Supabase query results silently typed as `never`
**Symptom:** `npx tsc --noEmit` shows errors like `Property 'id' does not exist on type 'never'` across many files that call `.from(table).select(...)`.
**Cause:** Newer `@supabase/postgrest-js` majors (pulled in transitively by `@supabase/supabase-js`) ship a much stricter type-level query-string parser that a hand-written `types/database.ts` (this project doesn't use Supabase's CLI-generated types) cannot satisfy — it silently collapses query result types to `never` instead of erroring clearly.
**Fix already applied:** `package.json` pins `"@supabase/supabase-js": "2.45.4"` and `"@supabase/ssr": "0.5.2"` — **exact versions, no `^`.** This resolves to `postgrest-js@1.16.1`, which uses the older, simpler generic-based type system this project's types are written against.
**Detection:** `grep '"@supabase' package.json` — confirm both lines have no `^` or `~` prefix.
**If it's drifted:** `rm -rf node_modules/@supabase package-lock.json && npm install` (this one time, `install` not `ci`, specifically to regenerate the lock file against the pinned versions), then re-run Phase 0.

### 2.2 Next.js version
`package.json` pins `"next": "14.2.35"` specifically — an earlier draft used `14.2.15`, which has a known, published security vulnerability. Do not downgrade below `14.2.35` without checking Next.js's security advisories for the target version first.

### 2.3 Fonts load at runtime, not build time — don't "fix" this
`app/layout.tsx` loads Space Grotesk / Inter / IBM Plex Mono via a `<link>` tag in the HTML `<head>` (fetched by the *browser*, at runtime) rather than via `next/font/google` (which fetches font files *during* `next build`). This is deliberate: it keeps the build working in network-restricted environments (some CI runners, sandboxes). If a future change swaps this to `next/font/google`, confirm the build environment has outbound access to `fonts.googleapis.com` / `fonts.gstatic.com` first, or builds may start failing intermittently depending on network conditions.

### 2.4 `next build` needs env vars present — even fake ones — to succeed
Several pages (login, signup) construct a Supabase browser client at module scope. `next build` statically analyzes/prerenders these pages, which means `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be *non-empty strings* at build time or the build fails with a Supabase client construction error — **which looks like a real app bug but usually isn't.** Before treating a build failure as a code bug, confirm `.env.local` (or the deploy platform's environment variables) are actually populated.

---

## 3. Phase −1: Environment preflight

- [ ] `node -v` → expect `v20.x`. This project was built and tested against Node 20.
- [ ] Confirm `.env.local` exists at the project root with **real, non-empty values** for every variable in `.env.example`:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL`.
  **If any are missing or blank, stop and get real values from the human before continuing.** Do not fabricate placeholder values and proceed past this phase — every phase from Phase 2 onward needs real credentials to mean anything, and a "pass" against fake credentials is a false pass.
- [ ] `npm ci` — **use `ci`, not `install`, here.** `ci` installs exactly what's pinned in `package-lock.json`; `install` can silently bump minor/patch versions on dependencies that use `^` ranges and reintroduce Known Issue 2.1. Expect a clean install, exit code 0.

Report Phase −1 before continuing.

---

## 4. Phase 0: Static correctness gate

**Nothing below this line matters until this phase is 100% green.** This phase exists specifically to separate "the code itself is broken" from "a live integration is broken" — two different problems needing two different kinds of fixes.

1. `npm run typecheck` → expect **zero output**, exit code 0. Any error here — check Known Issue 2.1 first.
2. `npm run test` → expect all test files passing. As of this writing there are **7 test files, 62 tests total**:
   `lib/scoring.test.ts`, `lib/rag/ingest.test.ts`, `lib/rate-limit.test.ts`, `lib/ai/prompts.test.ts`, `lib/ai/tools.test.ts`, `lib/automation-events.test.ts`, `lib/analytics.test.ts`.
   If the count is lower, some test file is missing/broken — investigate why before writing new tests in Phase 8. If any test fails, **this is a real logic bug** — fix the actual code. Only change a test's expectation if you can concretely justify that the test's original expectation was wrong, and say so explicitly in your report.
3. `npm run build` → expect `Compiled successfully` and a route table listing **~21 routes**. See Known Issue 2.4 if this fails on an env-var-related error.
4. `npm run lint` → fix anything flagged as an actual error; style-only warnings don't need to block Phase 1, but don't ignore them either — note them for Phase 9.

Report Phase 0 with the literal test count and any failures verbatim before continuing.

---

## 5. Phase 1: Database reality check (READ-ONLY)

The human has said the database already exists — **do not re-run migrations blindly.** Run these read-only queries against the real Supabase project (SQL Editor, or any connected Postgres client) first to see what's actually there.

**Tables that should exist** (from migrations `0001`–`0005`):
```sql
select table_name from information_schema.tables where table_schema = 'public' order by table_name;
```
Expected: `organizations, users, businesses, kb_documents, kb_chunks, leads, conversations, messages, calendar_connections, bookings, automation_events`.

**Columns added by later migrations** (a common partial-migration gap):
```sql
select column_name from information_schema.columns where table_name = 'businesses' order by ordinal_position;
```
Must include `n8n_webhook_url` (added in `0004`) and `avg_job_value` (added in `0005`). If either is missing, that specific migration file was never applied — apply only the missing file(s) via the SQL Editor, not the full sequence again. Every migration file uses `if not exists` / `if not exists`-guarded `alter table` statements, so re-running an already-applied one is safe, but confirm this by reading the specific file before re-running it, not by assumption.

**Row Level Security is actually enabled** (defining a policy in a migration file does not guarantee it was applied if the migration only partially ran):
```sql
select relname, relrowsecurity from pg_class where relname in ('leads','conversations','messages','businesses','bookings','kb_chunks','automation_events');
```
Expect `relrowsecurity = true` on every row. If any is `false`, re-run that specific table's `alter table ... enable row level security;` line from its source migration file.

**pgvector and the semantic search function exist:**
```sql
select extname from pg_extension where extname = 'vector';
select proname from pg_proc where proname = 'match_kb_chunks';
```
Both must return a row. **If `match_kb_chunks` is missing, the Knowledge Base feature will silently return zero results with no error thrown** — this is one of the most likely "looks broken but nothing is erroring" issues in this codebase. If missing, re-apply the `create or replace function match_kb_chunks(...)` block from `supabase/migrations/0001_init.sql`.

**Demo seed data present:**
```sql
select id, name, public_widget_key from businesses where id = '00000000-0000-0000-0000-000000000002';
```
Expect one row: `Aurora HVAC & Air`, widget key `demo-widget-key`. If missing, this doesn't block anything real, but note it — you'll want a real business to test against instead of the seed anyway.

Report Phase 1 listing exactly what was missing (if anything) and exactly which statements were re-applied.

---

## 6. Phase 2: Auth & multi-tenant (backend)

1. `npm run dev`, confirm it starts with no errors, visit `http://localhost:3000`.
2. Sign up a fresh test account at `/signup`. Confirm in Supabase: a new row in `organizations`, a matching row in `users` (with the new user's `id` and correct `organization_id`), and a new row in `businesses`. If any of these three didn't get created, the failure is in `app/api/v1/organizations/provision/route.ts` — check its error handling and Supabase logs.
3. Log out, log back in at `/login` — confirm the session persists across a page refresh.
4. In Settings, use "Add another business." Confirm a second `businesses` row is created under the **same** `organization_id`, and the sidebar switcher shows both.
5. **Multi-tenant isolation — this is the most security-critical check in this entire runbook.** Add a lead/document to Business A. Switch to Business B via the sidebar. Confirm Business B's Inbox/Leads/Knowledge Base do **not** show Business A's data. If they do, this is a Row Level Security or `lib/current-business.ts` cookie-validation bug — treat it as a P0 security issue, not a cosmetic one, and stop to fix it before any other phase.

Report Phase 2.

---

## 7. Phase 3: AI widget + RAG (backend)

1. In Knowledge Base, add a document containing one specific, checkable fact (e.g., a made-up price).
2. Confirm in Supabase that `kb_documents` got a new row **and** `kb_chunks` got at least one new row **with a non-null `embedding` column**. If `kb_chunks` is empty, the embedding call in `lib/rag/ingest.ts` (`embedText`) is failing silently — check `GEMINI_API_KEY` validity and Gemini API quota/rate limits first.
3. Open the widget at `/widget/<public_widget_key>`. Ask about the fact you just added. **It must answer correctly, grounded in what you wrote** — if it doesn't reference your content at all, `lib/rag/retrieve.ts`'s similarity threshold (`MIN_SIMILARITY = 0.55`) or the `match_kb_chunks` function (Phase 1) is the likely culprit.
4. **Ask something not in the knowledge base.** The agent must say it doesn't know / offer to connect a human — **it must not invent an answer.** If it hallucinates, this is the single most important bug to fix in the entire project — check the system prompt grounding rules in `lib/ai/prompts.ts`.
5. Give it your name and email in the chat. Confirm in Supabase: the `leads` row updated with `name`/`email` and `status = 'qualified'`, and a `messages` row with a non-null `tool_calls` JSON column recording the `capture_lead_info` call.

Report Phase 3.

---

## 8. Phase 4: Booking / Google Calendar (backend)

1. In Settings, click Connect under Google Calendar — confirm the OAuth redirect and callback complete without error (`app/api/integrations/google-calendar/connect/route.ts` → Google → `app/api/integrations/google-calendar/callback/route.ts`), and `calendar_connections` gets a new row with a non-null `access_token`/`refresh_token`.
2. In the widget, ask to book a specific future date/time. Confirm the agent calls `check_availability` before `create_booking` (check the `tool_calls` JSON on the relevant `messages` rows) — the system prompt in `lib/ai/prompts.ts` explicitly requires this order; if `create_booking` is called without a preceding `check_availability` in the same conversation, that's a prompt-adherence bug worth flagging even though it can't be hard-enforced in code.
3. **Open the actual Google Calendar and confirm the event is really there.** Don't trust the app's success message alone.
4. Confirm a `bookings` row was created with the correct `calendar_event_id`, and the corresponding `leads.status` is now `'booked'`.
5. Deliberately ask to book a time you've already blocked on the real calendar — confirm the agent offers an alternative (`suggested_start_iso`) instead of double-booking.

Report Phase 4.

---

## 9. Phase 5: Lead scoring & escalation (backend)

1. After Phase 3/4's conversation, check `leads.score` — confirm it's a non-zero number consistent with the signals given (see `lib/scoring.ts` weights: email +25, phone +15, name +10, service_interest +15, urgency language +20, 4+ visitor messages +10).
2. Send a message containing urgency language (e.g., "my AC is broken, I need someone today") and confirm the score increases accordingly — this exercises `detectUrgency()` in `lib/scoring.ts`.
3. Ask to speak to a human. Confirm `escalate_to_human` fires: `leads.status` → `'escalated'`, `conversations.status` → `'escalated'`, and `conversations.summary_text` is populated with a real AI-generated summary (via `lib/ai/summarize.ts`) — not null, not a placeholder.

Report Phase 5.

---

## 10. Phase 6: Automation events / n8n (backend)

1. If n8n isn't running yet: `docker compose up -d` from the project root, confirm `http://localhost:5678` loads.
2. Import the three workflows from `/automations`, replace the placeholder Slack webhook URL, activate them, and paste the webhook URL into Settings → Automations.
3. Trigger each event and confirm delivery: qualify a new lead (`lead.qualified`), escalate a conversation (`lead.escalated`), complete a booking (`booking.created`). For each, confirm a row in `automation_events` with a non-null `delivered_at` and the corresponding Slack message actually arrived.
4. Confirm the app never throws or breaks the widget response if no webhook URL is configured (`lib/automation-events.ts` is designed to no-op gracefully) — test this by clearing the webhook URL and repeating step 3; the widget must still respond normally even though no Slack message arrives.

Report Phase 6.

---

## 11. Phase 7: Analytics (backend)

1. Before setting an average job value: confirm the Analytics page shows **"—" for Revenue Recovered, not "$0."** This is deliberate (`computeRevenueRecovered` in `lib/analytics.ts` returns `null` until a value is set) — if it shows `$0`, that's a regression.
2. Set an average job value in Settings → Branding & revenue. Confirm Analytics now shows `bookings_count × avg_job_value`.
3. Confirm the funnel (New / Qualified / Booked) counts sum to the total lead count for the period, and the leads/bookings trend chart renders with real data points.

Report Phase 7.

---

## 12. Phase 8: Test coverage audit — close the real gaps

The existing 62 tests cover pure calculation logic and the agent's tool-execution layer thoroughly — **they deliberately do not cover the API route handlers themselves, or a few specific lib files.** This phase exists to close that gap. Do not skip it; "run the existing tests" (Phase 0) and "the codebase is adequately tested" are different claims.

**Files with zero test coverage today — write a `.test.ts` next to each, following the mocking pattern already established in `lib/ai/tools.test.ts` (mock `createServiceRoleClient` with a chainable fake object, mock external SDKs at the module boundary with `vi.mock`):**

1. `lib/current-business.ts` — **the highest-priority gap.** This is the most security-sensitive logic in the multi-tenant system (cookie-based active-business resolution with an ownership re-check). Write tests confirming: a cookie pointing to a business in a *different* organization is rejected and falls back to the default business; a valid cookie is honored; no cookie falls back to the first business under the org.
2. `lib/conversations.ts` — test `getBusinessByWidgetKey` (valid key found, invalid key returns null), `getOrCreateConversation` (creates on first call, reuses the same open conversation on a second call for the same session), `getConversationHistory` (returns messages in creation order).
3. `lib/google-calendar.ts` — currently only exercised indirectly (mocked out entirely) via `lib/ai/tools.test.ts`. Write direct tests for `checkAvailability`'s forward-scanning logic (mock the Calendar API's `freebusy.query` response) and for the OAuth URL builder (`getGoogleAuthUrl`) confirming the `state` parameter carries the business ID correctly.
4. API route handlers — at minimum, add integration-style tests (mocking the same boundaries as above, but exercising the actual route handler function, not just the underlying lib) for `app/api/widget/message/route.ts` (the highest-traffic, highest-value route in the app) and `app/api/v1/businesses/switch/route.ts` (security-relevant — confirm it actually rejects switching to a business outside the caller's org).

Do not consider this phase done until every file listed above has a test file, and `npm run test` count has grown accordingly — report the new total.

Report Phase 8 with the before/after test count.

---

## 13. Phase 9: Frontend pass (LOWER PRIORITY — only start this after Phases 0–8 all report PASS)

The human has explicitly said backend correctness comes first. Do not start here early just because these are visually obvious.

- [ ] Sidebar behavior right at the `md` (768px) breakpoint — confirm no layout jump/overlap between the icon-rail and full-label states.
- [ ] Every `"use client"` form component (`kb-uploader.tsx`, `automation-webhook-form.tsx`, `business-branding-form.tsx`, `add-business-form.tsx`, login/signup forms) — confirm each has a visible loading/disabled state during its `fetch` call, not just after. Audit for any form missing this.
- [ ] Empty states — Inbox, Leads, Bookings with zero data: confirm each shows a helpful message, not a blank area.
- [ ] `components/widget/chat-widget.tsx` — test scroll behavior with a long (20+ message) conversation; confirm auto-scroll-to-bottom works and doesn't fight the user if they've scrolled up to read history.
- [ ] Widget iframe sizing on small mobile viewports (`public/embed.js` sets fixed panel dimensions with `max-width`/`max-height` overrides) — confirm it doesn't overflow the viewport on a small phone screen.
- [ ] Color contrast: the `signal-500` amber accent (`#F2A93B`) against white backgrounds — run a WCAG contrast check on any place it's used for text (not just backgrounds/accents), since amber-on-white can fail AA contrast for text specifically.
- [ ] Any `next lint` warnings noted but deferred from Phase 0.

Report Phase 9 as a punch list with each item's status, not a single pass/fail — this phase is inherently a list of small fixes, not one gate.

---

## 14. Final acceptance checklist

Only consider the project "market ready" when every line below is checked, not before:

- [ ] Phase 0 (static correctness): PASS
- [ ] Phase 1 (database reality check): PASS, no missing tables/columns/functions/RLS gaps
- [ ] Phase 2 (auth/multi-tenant): PASS, including the tenant-isolation check specifically
- [ ] Phase 3 (AI widget/RAG): PASS, including the hallucination-refusal check specifically
- [ ] Phase 4 (booking): PASS, including a real, human-verified Google Calendar event
- [ ] Phase 5 (scoring/escalation): PASS
- [ ] Phase 6 (automation/n8n): PASS, including the no-webhook-configured graceful path
- [ ] Phase 7 (analytics): PASS, including the null-vs-zero revenue check
- [ ] Phase 8 (test coverage): all four listed gap areas now have real test files, total test count reported and higher than 62
- [ ] Phase 9 (frontend punch list): every item addressed or explicitly deferred with the human's sign-off

When all of the above are true, report a single final summary to the human: total tests passing, any items deferred and why, and a plain-language statement of what is and isn't yet verified against live production traffic (automated tests mock external services — they cannot catch "the third-party API changed its response shape" the way the live checks in Phases 2–7 can).
