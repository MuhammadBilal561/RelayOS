import { DollarSign, Target, Timer, CalendarDays } from "lucide-react";
import { getCurrentBusiness } from "@/lib/current-business";
import { getAnalyticsSummary } from "@/lib/analytics";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsTrendChart } from "@/components/dashboard/leads-trend-chart";
import { SectionHeader } from "@/components/dashboard/section-header";
import { KpiCard } from "@/components/dashboard/kpi-card";

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
      icon: DollarSign,
      tone: "signal" as const,
    },
    {
      label: "Conversion rate",
      value: summary.conversionRate === null ? "—" : `${summary.conversionRate}%`,
      hint: "Leads → booked",
      icon: Target,
      tone: "relay" as const,
    },
    {
      label: "Avg. response time",
      value: summary.avgResponseSeconds === null ? "—" : `${summary.avgResponseSeconds}s`,
      hint: "Visitor message → AI reply",
      icon: Timer,
      tone: "neutral" as const,
    },
    {
      label: "Bookings",
      value: summary.bookedLeads,
      hint: "Last 30 days",
      icon: CalendarDays,
      tone: "neutral" as const,
    },
  ];

  const maxFunnelCount = Math.max(1, ...summary.funnel.map((s) => s.count));

  return (
    <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
      <SectionHeader
        eyebrow="Analytics"
        title="Revenue recovery"
        description="Last 30 days, computed live from Postgres — nothing here is mocked."
      />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Leads & bookings</CardTitle>
            <CardDescription>Daily volume over the last 30 days.</CardDescription>
          </div>
          <Badge variant="outline">live</Badge>
        </CardHeader>
        <div className="p-5 pt-2">
          <div className="mb-3 flex items-center gap-4 text-[11px] font-medium text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-signal-500" aria-hidden="true" /> Leads
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-relay-500" aria-hidden="true" /> Bookings
            </span>
          </div>
          <LeadsTrendChart data={summary.dailySeries} />
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Funnel</CardTitle>
            <CardDescription>Leads by stage, scaled to the widest stage.</CardDescription>
          </div>
        </CardHeader>
        <div className="space-y-4 p-5">
          {summary.funnel.map((stage, i) => {
            const pct = Math.round((stage.count / maxFunnelCount) * 100);
            return (
              <div key={stage.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="flex items-baseline gap-2 text-sm text-ink-700">
                    <span className="font-mono text-[10px] text-ink-300">0{i + 1}</span>
                    {stage.label}
                  </span>
                  <span className="font-mono text-xs text-ink-500">{stage.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-paper-100" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-signal-400 to-signal-500"
                    style={{ width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
