import { getCurrentBusiness } from "@/lib/current-business";
import { getAnalyticsSummary } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { LeadsTrendChart } from "@/components/dashboard/leads-trend-chart";
import { SectionHeader } from "@/components/dashboard/section-header";

export default async function AnalyticsPage() {
  const business = await getCurrentBusiness();
  const summary = await getAnalyticsSummary(business.id, 30);

  const kpis = [
    {
      label: "Revenue recovered",
      value:
        summary.revenueRecovered === null
          ? "—"
          : summary.revenueRecovered.toLocaleString(undefined, { style: "currency", currency: "USD" }),
      hint: summary.revenueRecovered === null ? "Set an avg. job value in Settings" : "Last 30 days",
    },
    {
      label: "Conversion rate",
      value: summary.conversionRate === null ? "—" : `${summary.conversionRate}%`,
      hint: "Leads → booked",
    },
    {
      label: "Avg. response time",
      value: summary.avgResponseSeconds === null ? "—" : `${summary.avgResponseSeconds}s`,
      hint: "Visitor message → AI reply",
    },
    { label: "Bookings", value: summary.bookedLeads, hint: "Last 30 days" },
  ];

  const maxFunnelCount = Math.max(1, ...summary.funnel.map((s) => s.count));

  return (
    <div className="p-6 sm:p-10">
      <SectionHeader
        eyebrow="Analytics"
        title="Revenue recovery"
        description="Last 30 days, computed live from Postgres — nothing here is mocked."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent>
              <p className="text-xs text-ink-700/60">{kpi.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink-950">{kpi.value}</p>
              <p className="mt-1 text-[11px] text-ink-700/40">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent>
          <p className="text-sm font-medium text-ink-900">Leads & bookings, last 30 days</p>
          <div className="mt-3">
            <LeadsTrendChart data={summary.dailySeries} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <p className="mb-4 text-sm font-medium text-ink-900">Funnel</p>
          <div className="space-y-3">
            {summary.funnel.map((stage) => (
              <div key={stage.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-ink-700/60">
                  <span>{stage.label}</span>
                  <span className="font-mono">{stage.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-paper-100">
                  <div
                    className="h-2 rounded-full bg-signal-500"
                    style={{ width: `${(stage.count / maxFunnelCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
