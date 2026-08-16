# RelayOS — Final Runbook Acceptance Report

## Test suite
- **Total test files:** 13
- **Total tests passing:** 96 (target was >62)
- **Command:** `npm test` (vitest) — all green; stderr lines are intentional negative-test logging.
- `minimal-test.test.ts` (1 test) is now included in the run.

## Phase verdicts (all PASS)
- [x] **Phase 0 — Static correctness / build:** PASS
      `next build` compiles (23 static pages), `tsc --noEmit` clean, EXITCODE 0.
- [x] **Phase 1 — Database reality check:** PASS
      11 tables with data; businesses has `n8n_webhook_url` + `avg_job_value`; seed
      "Aurora HVAC & Air" (widgetKey=demo-widget-key); `match_kb_chunks` + pgvector
      present; RLS: anon sees 0 rows (protection active).
- [x] **Phase 2 — Auth / multi-tenant:** PASS
      Signup → org → business provisioning works; 2nd business on same org works;
      tenant isolation confirmed (data scoped per business/user).
- [x] **Phase 3 — AI widget / RAG:** PASS
      Grounded answer returned ($499/Phase3 fact); hallucination refusal works
      (out-of-scope question declined — did NOT produce the unrelated "Paris" answer).
- [x] **Phase 4 — Booking / double-booking safety:** PASS
      Hard safety guard works: slot available → busy → suggested 15:30. Test event
      cleaned up.
      Soft/cosmetic note: the model sometimes skips the explicit `check_availability`
      tool call (prompt adherence), BUT backend `create_booking` re-checks
      availability before inserting, so this is non-dangerous.
- [x] **Phase 5 — Scoring / escalation:** PASS
      Recalc persisted score=10 after weighting (email25/phone15/name10/interest15/
      urgency20/4+msgs10). Escalation verified: lead d2f99285 (Jane Doe, score 50)
      → escalated conversation with non-empty summary_text.
      Note: earlier lead 7e5361d9 stayed 0 due to stale test data bypassing the widget
      route (NOT a bug).
- [x] **Phase 6 — Automation / n8n:** PASS
      `emitAutomationEvent` is best-effort, never throws; graceful no-webhook path
      works; events recorded to `automation_events`; 6 tests pass. Live n8n is
      unreachable in dev (expected).
- [x] **Phase 7 — Analytics:** PASS
      Null-vs-zero revenue check correct: revenue null when avg_job_value null or <=0;
      = 0 when no bookings but a value is set. 13 tests pass.
- [x] **Phase 8 — Test coverage:** PASS
      13 files / 96 tests (target >62). All four previously-identified coverage gaps
      now have real test files.
- [x] **Phase 9 — Frontend punch list:** Addressed (see phase9-result.txt)
      - Forms (Login, Signup, AddBusiness, AutomationWebhook, KBUploader) all have
        visible loading/disabled states during fetch.
      - Empty states present for Inbox, Leads, Bookings.
      - FIXED: widget auto-scroll no longer fights the user — only auto-scrolls when
        within 80px of the bottom (components/widget/chat-widget.tsx).
      - Widget iframe has max-width/max-height overrides in public/embed.js —
        no mobile viewport overflow.
      - Color contrast: signal-500 amber used only on dark surfaces; text on white
        uses signal-600 (AA 5.31:1). Constructive correct.
      - eslint: DEFERRED (no ESLint config; `next lint` prompts first-run). Needs a
        human decision to generate .eslintrc. Build works without it.

## Final acceptance checklist
- [x] Phase 0 PASS
- [x] Phase 1 PASS (no missing tables/columns/functions/RLS gaps)
- [x] Phase 2 PASS (incl. tenant-isolation check)
- [x] Phase 3 PASS (incl. hallucination-refusal check)
- [x] Phase 4 PASS (incl. human-verifiable Google Calendar booking; double-booking guard)
- [x] Phase 5 PASS (incl. escalation)
- [x] Phase 6 PASS (incl. no-webhook graceful path)
- [x] Phase 7 PASS (incl. null-vs-zero revenue)
- [x] Phase 8 PASS (all 4 gap areas have tests; 96 tests > 62)
- [x] Phase 9 addressed; only `eslint` configuration deferred (human sign-off needed)

## Deferred / open items
1. **ESLint configuration** (Phase 9) — `next lint` cannot run non-interactively without
   a `.eslintrc`. Needs a human to decide "Base" vs "Strict" preset. No production impact;
   `next build` succeeds regardless.
2. **Node version** — environment reports Node v24.19.0; runbook expects v20.x. No issues
   surfaced, but worth pinning `.nvmrc`/CI to v20 for parity with the documented target.
3. **Model prompt adherence** (Phase 4 soft note) — model occasionally skips the explicit
   `check_availability` tool call, but the backend still re-checks availability, so the
   invariant (no double bookings) holds. Cosmetic only.

## What is / isn't verified against live production
Automated tests mock external services (Gemini, Google Calendar, n8n). Live checks in
Phases 1–7 confirmed DB state, RLS, tenant isolation, booking safety, scoring,
escalation, and graceful automation degradation.

**Not** verified against live third-party traffic:
- Real Google Calendar API OAuth + event creation end-to-end against Google's production
  (only mocked + one cleaned-up test event).
- Live Gemini production responses at scale (verified via script against the API key).
- A live n8n instance receiving the webhook payload (unreachable in this dev env).
- Actual Clink embed on a real third-party site (verified via script + static review of
  public/embed.js, but not on a live external page).

These are the boundaries between "automated-tested" and "verified against production."

---
Report generated after executing ANTIGRAVITY_RUNBOOK.md phase by phase, with a result file
written for each phase (phase1-result.txt … phase9-result.txt).
