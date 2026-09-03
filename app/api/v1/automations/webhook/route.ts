import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_WEBHOOK_FIELDS = [
  "n8n_webhook_url_lead_qualified",
  "n8n_webhook_url_lead_escalated",
  "n8n_webhook_url_booking_created",
] as const;

function validateWebhookUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "URL must use http: or https: protocol";
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

  const { businessId, webhookUrls } = body as {
    businessId?: string;
    webhookUrls?: Record<string, string | null>;
  };

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  if (!webhookUrls || typeof webhookUrls !== "object") {
    return NextResponse.json(
      { error: "webhookUrls object is required" },
      { status: 400 }
    );
  }

  // Validate each provided URL
  const updates: Record<string, string | null> = {};
  for (const [key, url] of Object.entries(webhookUrls)) {
    if (!ALLOWED_WEBHOOK_FIELDS.includes(key as typeof ALLOWED_WEBHOOK_FIELDS[number])) {
      return NextResponse.json(
        { error: `Invalid webhook field: ${key}` },
        { status: 400 }
      );
    }

    if (url === null || url === "") {
      updates[key] = null;
      continue;
    }

    if (typeof url !== "string") {
      return NextResponse.json(
        { error: `Webhook URL for ${key} must be a string` },
        { status: 400 }
      );
    }

    const validationError = validateWebhookUrl(url);
    if (validationError) {
      return NextResponse.json(
        { error: `Invalid URL for ${key}: ${validationError}` },
        { status: 400 }
      );
    }

    updates[key] = url;
  }

  // RLS confirms this user's organization actually owns the business.
  const { error } = await supabase.from("businesses").update(updates).eq("id", businessId);

  if (error && /schema cache|does not exist|could not find/i.test(error.message)) {
    const fallbackUrl =
      updates.n8n_webhook_url_booking_created ??
      updates.n8n_webhook_url_lead_qualified ??
      updates.n8n_webhook_url_lead_escalated ??
      null;
    const { error: fallbackError } = await supabase
      .from("businesses")
      .update({ n8n_webhook_url: fallbackUrl })
      .eq("id", businessId);
    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
    return NextResponse.json({ saved: true });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}