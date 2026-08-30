import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutomationWebhookForm } from "@/components/dashboard/automation-webhook-form";
import { BusinessBrandingForm } from "@/components/dashboard/business-branding-form";
import { AddBusinessForm } from "@/components/dashboard/add-business-form";
import { SectionHeader } from "@/components/dashboard/section-header";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { calendar_connected?: string; calendar_error?: string };
}) {
  const supabase = createServerSupabaseClient();
  const business = await getCurrentBusiness();

  const [{ data: connectionData }, { data: businessDetailsData }] = await Promise.all([
    supabase
      .from("calendar_connections")
      .select("connected_email")
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("n8n_webhook_url, n8n_webhook_url_lead_qualified, n8n_webhook_url_lead_escalated, n8n_webhook_url_booking_created, avg_job_value")
      .eq("id", business.id)
      .single(),
  ]);

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-relayos-domain.vercel.app";
  const snippet = `<script src="${appOrigin}/embed.js" data-widget-key="${business.public_widget_key}"></script>`;

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-10">
      <SectionHeader eyebrow="Settings" title={business.name} />

      {searchParams.calendar_connected && (
        <p className="mt-4 rounded-lg bg-relay-500/10 px-3 py-2 text-sm text-relay-600">
          Google Calendar connected — the widget can now check availability and book appointments.
        </p>
      )}
      {searchParams.calendar_error && (
        <p className="mt-4 rounded-lg bg-alert-500/10 px-3 py-2 text-sm text-alert-600">
          {searchParams.calendar_error}
        </p>
      )}

      <Card className="mt-6">
        <CardContent>
          <p className="mb-3 text-sm font-medium text-ink-900">Branding & revenue</p>
          <BusinessBrandingForm
            businessId={business.id}
            initialName={business.name}
            initialBrandColor={business.brand_color}
            initialAvgJobValue={businessDetailsData?.avg_job_value ?? null}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink-900">Google Calendar</p>
              <p className="mt-1 text-sm text-ink-700/60">
{connectionData
                  ? `Connected as ${connectionData.connected_email}`
                  : "Connect a calendar so the AI can check availability and book appointments."}
              </p>
            </div>
            {connectionData ? (
              <Badge variant="live">
                <span className="signal-dot signal-dot--live" /> connected
              </Badge>
            ) : (
              <a href="/api/integrations/google-calendar/connect">
                <Button variant="signal" size="sm">
                  Connect
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <p className="text-sm font-medium text-ink-900">Widget embed code</p>
          <p className="mt-1 text-sm text-ink-700/60">
            Paste this right before the closing <code className="font-mono">&lt;/body&gt;</code> tag on the
            client's website.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-950 p-4 font-mono text-xs text-paper-50">
            {snippet}
          </pre>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <p className="text-sm font-medium text-ink-900">Automations (n8n)</p>
          <p className="mt-1 text-sm text-ink-700/60">
            Each event posts to its own n8n webhook URL. Leave blank to disable that automation.
            <br />
            <a
              href="/automations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal-600 underline underline-offset-2 hover:no-underline"
            >
              See example n8n workflows →
            </a>
          </p>
          <div className="mt-3">
            <AutomationWebhookForm
              businessId={business.id}
              initialUrls={{
                n8n_webhook_url_lead_qualified: businessDetailsData?.n8n_webhook_url_lead_qualified ?? "",
                n8n_webhook_url_lead_escalated: businessDetailsData?.n8n_webhook_url_lead_escalated ?? "",
                n8n_webhook_url_booking_created: businessDetailsData?.n8n_webhook_url_booking_created ?? "",
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <p className="text-sm font-medium text-ink-900">Live preview</p>
          <p className="mt-1 text-sm text-ink-700/60">
            <a
              href={`/widget/${business.public_widget_key}`}
              target="_blank"
              className="text-signal-600 underline underline-offset-4"
            >
              Open the widget in a new tab →
            </a>
          </p>
        </CardContent>
      </Card>
      <Card className="mt-4" id="add-business">
        <CardContent>
          <p className="text-sm font-medium text-ink-900">Agency mode — add another business</p>
          <p className="mt-1 text-sm text-ink-700/60">
            One login, many client businesses — switch between them from the sidebar at any time.
          </p>
          <div className="mt-3">
            <AddBusinessForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
