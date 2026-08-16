# RelayOS — Manual Test Guide (click-by-click)

This is the simplest way to see every feature working with your own eyes.
No code needed — just follow the steps in order. Each step maps to a real feature.

**When to do this:** after `npm run dev` is running and you're logged in.

---

## 0. Start the app

1. Open a terminal in the project folder.
2. Run: `npm run dev`
3. Open your browser at: **http://localhost:3000**

You should see the **landing page** ("Never let a lead go cold.").
- ✅ Feature: Landing page / marketing page renders.

---

## 1. Create an account (Multi-tenant / Auth)

1. Click **"Open the dashboard"** → then **Sign up**.
2. Enter your email + a password, submit.
3. You're logged in immediately and your **organization + first business** are auto-created.

- ✅ Feature: Signup is frictionless (no email confirmation in local dev).
- ✅ Feature: Signup button shows a loading/disabled state while it works.

---

## 2. The Dashboard (Overview)

1. You land on the **Overview** page.
2. Look at the sidebar — you should see: Overview, Inbox, Leads, Bookings, Knowledge Base, Analytics, Settings.

- ✅ Feature: Dashboard shell + navigation works.
- ✅ Feature: Empty states show friendly messages (Inbox/Leads/Bookings have no data yet).

---

## 3. Knowledge Base (RAG — the AI's brain)

1. Go to **Knowledge Base** in the sidebar.
2. Click **Add document** (or re-save the seeded "Services & Pricing" doc).
3. Paste a short paragraph about your services and pricing, e.g.:
   > "We charge $499 for a full AC tune-up. Service area is Austin, TX. We offer 24/7 emergency calls."
4. Save it. You'll see a **"Embedding…"** loading state while it processes.

- ✅ Feature: RAG ingestion works (the doc gets chunked + embedded into the database).

---

## 4. The AI Widget (the main feature)

1. Go to **Settings → scroll to Widget key** and copy your widget key, OR just use the demo: **http://localhost:3000/widget/demo-widget-key**
2. Open that URL in a new tab. This is the AI chat widget.
3. Type a question that's in your knowledge base, e.g.:
   > "How much is an AC tune-up?"
   - It should answer **"$499"** — proving it's grounded in YOUR docs (RAG), not a wild guess.
4. Now test the **refusal / anti-hallucination**:
   > "What's the weather in Paris?"
   - It should politely say it doesn't know / can't answer. It must NOT make up a fake answer.
5. Send several messages (10+). Watch it auto-scroll.

- ✅ Feature: RAG-grounded answers.
- ✅ Feature: Refuses out-of-scope (no hallucination).
- ✅ Feature: Chat auto-scroll + "thinking…" indicator + send button disabled while sending.

---

## 5. Lead Scoring (the AI qualifies leads)

1. In the same widget, start a fresh conversation.
2. Give your **name, phone number, and email** when asked.
3. Say something urgent: **"My AC is broken, I need someone TODAY."**
4. Now go to **Leads** in the dashboard sidebar.
5. You'll see your lead with a **score**. The urgency words ("broken", "today") raise the score.

- ✅ Feature: Contact capture + urgency detection + scoring all work live.

---

## 6. Booking a real appointment (Google Calendar)

1. In the widget, ask: **"Can I book an appointment for tomorrow at 2pm?"**
2. The AI checks availability and confirms a slot.
3. **Test double-booking safety:** ask for the SAME exact slot again.
   - It should say that time is **already taken** and suggest a different time.
   - This proves the safety guard works (no double bookings).
4. Open **Bookings** in the dashboard — the appointment is listed.

- ✅ Feature: Booking flow end-to-end.
- ✅ Feature: Double-booking prevention (the critical safety feature).

**Note:** For a REAL Google Calendar event to appear, you must first go to **Settings → Google Calendar → Connect** and approve the OAuth screen once. Without connecting, booking still works but only stores in the DB.

---

## 7. Escalate to a human (AI handoff)

1. In the widget, type: **"I want to talk to a real person."**
2. The AI calls `escalate_to_human`, which:
   - records the conversation,
   - generates an **AI summary** of the chat.
3. Go to **Inbox** in the dashboard.
4. Open the conversation — you'll see the **summary** at the top.

- ✅ Feature: Escalation + conversation summaries for human handoff.

---

## 8. Analytics (Revenue + response time)

1. Go to **Settings → Branding & revenue**.
2. Set **"average value of a booked job"** to e.g. **250**.
3. Go to **Analytics** in the sidebar.
4. You'll see:
   - **Revenue recovered** = (number of bookings) × 250.
   - **Avg response time**, **Conversion rate**, and the **funnel** — all computed live.

- ✅ Feature: Analytics math is real and reacts to your actions.

---

## 9. Agency mode / multiple businesses (multi-tenant)

1. Go to **Settings → Agency mode → Add another business**.
2. Create a second business (e.g. "Bob's Plumbing").
3. Use the **business switcher** at the top of the sidebar to flip between them.
4. Notice each has its **own** widget key, KB, bookings, and analytics — fully isolated.

- ✅ Feature: Multi-business, isolated tenants (Row Level Security works).

---

## 10. Automation (n8n) — optional but cool

If you set up n8n (docker compose up -d, import the workflows in `automations/`):

1. Go to **Settings → Automations**.
2. Paste the n8n **Webhook Production URL**.
3. Trigger a lead-qualified event (e.g. get a lead to score high in the widget).
4. Watch the n8n workflow fire (e.g. a Slack message).

**If you DON'T set up n8n:** the app should still work perfectly — automating degrades gracefully (no errors). That's by design.

- ✅ Feature: Automation events fire; graceful no-webhook path.

---

## Quick feature checklist (tick as you go)

| # | Feature | Where to look | Done? |
|---|---------|---------------|-------|
| 1 | Landing page | `/` | ☐ |
| 2 | Signup / auth | `/signup` | ☐ |
| 3 | Dashboard + empty states | `/overview`, `/inbox` | ☐ |
| 4 | Knowledge base upload | `/knowledge-base` | ☐ |
| 5 | AI chat with RAG answers | `/widget/demo-widget-key` | ☐ |
| 6 | Refuses out-of-scope (no hallucination) | widget | ☐ |
| 7 | Lead capture + scoring | widget → `/leads` | ☐ |
| 8 | Booking + double-booking guard | widget → `/bookings` | ☐ |
| 9 | Escalate + summary | widget → `/inbox` | ☐ |
| 10 | Analytics (revenue/funnel) | `/analytics` | ☐ |
| 11 | Multi-business isolation | `/settings` → switcher | ☐ |
| 12 | Automation (graceful or n8n) | `/settings` → Automations | ☐ |

---

## Automated safety net (optional, 5 seconds)

In the project terminal, run:

```bash
npm run test
```

This runs **96 automated tests** covering scoring, RAG, booking safety, rate limiting, analytics, and the agent's tool layer. If all pass, the core logic is solid — the manual steps above are what proves it works against the real services.

---

That's it — every feature is behind one of these 12 steps. Start with Knowledge Base (step 3), then the widget (step 4), and you'll have seen the core product in under 5 minutes.
