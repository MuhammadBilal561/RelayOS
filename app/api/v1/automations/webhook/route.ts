import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WEBHOOK_URL_FIELDS, isMissingColumnError } from "@/lib/automation-webhooks";


function validateWebhookUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "URL must use http: or https: protocol";
    }
    if (parsed.username || parsed.password) {
      return "URLs with embedded credentials are not allowed";
    }
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return "Production webhook URLs must use https";
    }
    return null;
  } catch {
    return "Invalid URL format";
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const { businessId, webhookUrls, webhookSecret } = body as {
    businessId?: string;
    webhookUrls?: Record<string, string | null>;
    webhookSecret?: unknown;
  };

  if (typeof businessId !== "string" || !businessId.trim()) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  if (!webhookUrls || typeof webhookUrls !== "object" || Array.isArray(webhookUrls)) {
    return NextResponse.json(
      { error: "webhookUrls object is required" },
      { status: 400 }
    );
  }

  // The secret is write-only from the dashboard. An omitted/blank value leaves
  // the existing secret untouched; this prevents the form from clearing a
  // configured signer just because the current value is never sent to clients.
  if (webhookSecret !== undefined && webhookSecret !== null && typeof webhookSecret !== "string") {
    return NextResponse.json({ error: "webhookSecret must be a string" }, { status: 400 });
  }
  const normalizedSecret = typeof webhookSecret === "string" ? webhookSecret.trim() : "";
  if (normalizedSecret && normalizedSecret.length < 32) {
    return NextResponse.json(
      { error: "webhookSecret must be at least 32 characters" },
      { status: 400 }
    );
  }

  // Validate each provided URL
  const updates: Record<string, string | null> = {};
  for (const [key, url] of Object.entries(webhookUrls)) {
    if (!WEBHOOK_URL_FIELDS.includes(key as typeof WEBHOOK_URL_FIELDS[number])) {
      return NextResponse.json(
        { error: `Invalid webhook field: ${key}` },
        { status: 400 }
      );
    }

    if (url === null) {
      updates[key] = null;
      continue;
    }

    if (typeof url !== "string") {
      return NextResponse.json(
        { error: `Webhook URL for ${key} must be a string` },
        { status: 400 }
      );
    }

    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      updates[key] = null;
      continue;
    }

    const validationError = validateWebhookUrl(normalizedUrl);
    if (validationError) {
      return NextResponse.json(
        { error: `Invalid URL for ${key}: ${validationError}` },
        { status: 400 }
      );
    }

    updates[key] = normalizedUrl;
  }
  if (normalizedSecret) updates.n8n_webhook_secret = normalizedSecret;

  // Nothing to write (all fields omitted) — treat as a no-op save.
  if (Object.keys(updates).length === 0) {
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId.trim())
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    return NextResponse.json({ saved: true });
  }

  // Writes ALWAYS target the three per-event columns. The legacy
  // n8n_webhook_url column is never written here: collapsing three
  // independent webhook URLs into one column silently corrupts the other
  // two automations (the bug where saving A/B/C left all three fields
  // showing C after a reload).
  //
  // RLS confirms this user's organization actually owns the business.
  const { data: updatedBusiness, error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", businessId.trim())
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) {
      console.error(
        "Automation webhook save failed: businesses table is missing the per-event webhook columns.",
        { operation: "save_automation_webhooks", businessId, fields: Object.keys(updates) }
      );
      return NextResponse.json(
        {
          error:
            "Database schema is missing the per-event webhook columns (n8n_webhook_url_lead_qualified, n8n_webhook_url_lead_escalated, n8n_webhook_url_booking_created). Run supabase/migrations/0008_three_webhook_urls.sql, then save again. Falling back to the legacy single-URL column would overwrite the other two events.",
        },
        { status: 500 }
      );
    }
    console.error("Automation webhook save failed:", error.message, {
      operation: "save_automation_webhooks",
      businessId,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RLS filters unauthorized businesses out of UPDATE ... RETURNING without
  // necessarily producing an error. Do not claim a successful save unless a
  // row was actually updated.
  if (!updatedBusiness) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json({ saved: true });
}
