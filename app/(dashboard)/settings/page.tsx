import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutomationWebhookForm } from "@/components/dashboard/automation-webhook-form";
import { BusinessBrandingForm } from "@/components/dashboard/business-branding-form";
import { AddBusinessForm } from "@/components/dashboard/add-business-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { calendar_connected?: string; calendar_error?: string };
}) {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("connected_email")
    .eq("business_id", business.id)
    .maybeSingle();

  const { data: businessDetails } = await supabase
    .from("businesses")
    .select("n8n_webhook_url, avg_job_value")
    .eq("id", business.id)
    .single();

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-relayos-domain.vercel.app";
  const snippet = `<script src="${appOrigin}/embed.js" data-widget-key="${business.public_widget_key}"></script>`;

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-700/40">Settings</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink-950">{business.name}</h1>

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
            initialAvgJobValue={businessDetails?.avg_job_value ?? null}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink-900">Google Calendar</p>
              <p className="mt-1 text-sm text-ink-700/60">
                {connection
                  ? `Connected as ${connection.connected_email}`
                  : "Connect a calendar so the AI can check availability and book appointments."}
              </p>
            </div>
            {connection ? (
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
            Paste your n8n webhook URL to receive real-time events — <code className="font-mono">lead.qualified</code>,{" "}
            <code className="font-mono">lead.escalated</code>, and <code className="font-mono">booking.created</code>{" "}
            — that you can turn into Slack alerts, nurture sequences, or reminders. See{" "}
            <code className="font-mono">/automations</code> in the repo for importable starter workflows.
          </p>
          <div className="mt-3">
            <AutomationWebhookForm businessId={business.id} initialUrl={businessDetails?.n8n_webhook_url ?? ""} />
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
