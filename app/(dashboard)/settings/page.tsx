import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  ExternalLink,
  Building2,
  Webhook,
  Palette,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { isMissingColumnError, resolveAutomationWebhookUrls } from "@/lib/automation-webhooks";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutomationWebhookForm } from "@/components/dashboard/automation-webhook-form";
import { BusinessBrandingForm } from "@/components/dashboard/business-branding-form";
import { AddBusinessForm } from "@/components/dashboard/add-business-form";
import { EmbedCode } from "@/components/dashboard/embed-code";
import { SettingsNav } from "@/components/dashboard/settings-nav";
import { SectionHeader } from "@/components/dashboard/section-header";

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 md:scroll-mt-8">
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900/[0.06] text-ink-500">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-sm font-semibold tracking-tight text-ink-950">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{description}</p>
        </div>
      </div>
      <Card className="mb-6">
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { calendar_connected?: string; calendar_error?: string };
}) {
  const supabase = createServerSupabaseClient();
  const business = await getCurrentBusiness();

  const [{ data: connectionData, error: connectionError }, businessDetailsResult] = await Promise.all([
    supabase
      .from("calendar_connections")
      .select("connected_email")
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select(
        "n8n_webhook_url_lead_qualified, n8n_webhook_url_lead_escalated, n8n_webhook_url_booking_created, n8n_webhook_url, avg_job_value"
      )
      .eq("id", business.id)
      .single(),
  ]);

  let webhookRow: Record<string, string | null> | null = null;
  let businessDetailsError: string | null = connectionError ? "Failed to load calendar connection." : null;
  if (connectionError) {
    console.error("Settings: failed to load calendar connection:", connectionError.message, { businessId: business.id });
  }
  if (!businessDetailsResult.error) {
    webhookRow = businessDetailsResult.data as Record<string, string | null>;
  } else {
    if (isMissingColumnError(businessDetailsResult.error)) {
      // Pre-migration-0008 schema: the per-event columns don't exist yet.
      // Read-only backward compatibility — surface the legacy URL for all
      // three events until the operator runs 0008 and saves per-event URLs.
      console.warn(
        "Settings: businesses table is missing the per-event webhook columns; falling back to legacy n8n_webhook_url for display. Run supabase/migrations/0008_three_webhook_urls.sql.",
        { businessId: business.id }
      );
      const { data: legacyRow, error: legacyError } = await supabase
        .from("businesses")
        .select("n8n_webhook_url, avg_job_value")
        .eq("id", business.id)
        .single();
      if (legacyRow) {
        webhookRow = {
          n8n_webhook_url: legacyRow.n8n_webhook_url,
          avg_job_value: legacyRow.avg_job_value,
        };
      } else if (legacyError) {
        businessDetailsError = "Failed to load automation settings.";
        console.error("Settings: failed to load legacy webhook URL:", legacyError.message, {
          businessId: business.id,
        });
      }
    } else {
      businessDetailsError = "Failed to load business settings.";
      console.error("Settings: failed to load business webhook details:", businessDetailsResult.error.message, {
        businessId: business.id,
      });
    }
  }

  const avgJobValue =
    !businessDetailsResult.error
      ? ((businessDetailsResult.data as { avg_job_value?: number | null } | null)?.avg_job_value ?? null)
      : (webhookRow as { avg_job_value?: number | null } | null)?.avg_job_value ?? null;

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-relayos-domain.vercel.app";
  const snippet = `<script src="${appOrigin}/embed.js" data-widget-key="${business.public_widget_key}"></script>`;

  const webhookUrls = resolveAutomationWebhookUrls(webhookRow);

  return (
    <div className="mx-auto w-full max-w-5xl p-6 sm:p-8">
      <SectionHeader
        eyebrow="Settings"
        title={business.name}
        description="Configure how your front office looks, where it connects, and what it triggers."
      />

      {searchParams.calendar_connected && (
        <p
          role="status"
          className="mt-6 flex items-center gap-2 rounded-lg bg-relay-500/10 px-3 py-2.5 text-sm text-relay-700"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Google Calendar connected — the widget can now check availability and book appointments.
        </p>
      )}
      {searchParams.calendar_error && (
        <p
          role="alert"
          className="mt-6 flex items-center gap-2 rounded-lg bg-alert-500/10 px-3 py-2.5 text-sm text-alert-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {searchParams.calendar_error}
        </p>
      )}
      {businessDetailsError && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-alert-500/10 px-3 py-2.5 text-sm text-alert-700"
        >
          {businessDetailsError} Please refresh and try again.
        </p>
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[190px_1fr]">
        <aside className="sticky top-8 hidden lg:block">
          <p className="mb-2 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-300">
            Settings
          </p>
          <SettingsNav />
        </aside>

        <div className="min-w-0">
          <SettingsSection
            id="business"
            icon={Palette}
            title="Business & revenue"
            description="Name, widget branding, and the average job value that powers revenue analytics."
          >
            <BusinessBrandingForm
              businessId={business.id}
              initialName={business.name}
              initialBrandColor={business.brand_color}
              initialAvgJobValue={avgJobValue}
            />
          </SettingsSection>

          <SettingsSection
            id="calendar"
            icon={CalendarDays}
            title="Google Calendar"
            description="Let the AI check real availability and book confirmed appointments."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {connectionData ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="live" dot dotTone="live">
                      connected
                    </Badge>
                    <p className="truncate text-sm text-ink-700">{connectionData.connected_email}</p>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-ink-500">
                    Not connected. Bookings can't be created until a calendar is authorized.
                  </p>
                )}
              </div>
              {connectionData ? (
                <a
                  href="/api/integrations/google-calendar/connect"
                  className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
                >
                  Reconnect calendar
                </a>
              ) : (
                <a href="/api/integrations/google-calendar/connect">
                  <Button variant="signal" size="sm">
                    Connect Google Calendar
                  </Button>
                </a>
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            id="widget"
            icon={ExternalLink}
            title="Widget"
            description="One line of code embeds the AI front office on any site."
          >
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-500">
                Paste this right before the closing <code className="rounded bg-ink-900/[0.06] px-1 py-0.5 font-mono text-xs text-ink-700">&lt;/body&gt;</code> tag on the client's website.
              </p>
              <EmbedCode snippet={snippet} />
              <div className="flex items-center justify-between gap-3 border-t border-ink-900/[0.08] pt-4">
                <p className="text-sm text-ink-500">See exactly what visitors see.</p>
                <Link
                  href={`/widget/${business.public_widget_key}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-signal-600 transition-colors hover:text-signal-700"
                >
                  Open live preview
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="automations"
            icon={Webhook}
            title="Automations (n8n)"
            description="Three independent webhooks — route each event to the workflow that should handle it."
          >
            <AutomationWebhookForm businessId={business.id} initialUrls={webhookUrls} />
          </SettingsSection>

          <SettingsSection
            id="add-business"
            icon={Building2}
            title="Agency mode"
            description="One login, many client businesses — switch between them from the sidebar at any time."
          >
            <AddBusinessForm />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
