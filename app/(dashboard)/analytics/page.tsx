import { DollarSign, Target, Timer, CalendarDays } from "lucide-react";
import { getCurrentBusiness } from "@/lib/current-business";
import { getAnalyticsSummary } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { LeadsTrendChart } from "@/components/dashboard/leads-trend-chart";
import { SectionHeader } from "@/components/dashboard/section-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageShell } from "@/components/dashboard/page-shell";

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
    <PageShell>
      <SectionHeader
        eyebrow="Analytics"
        title="Revenue recovery"
        description="Last 30 days, computed live from Postgres — nothing here is mocked."
      />

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-900/8 bg-[#fffdf8] shadow-[0_18px_40px_-24px_rgba(55,40,18,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-ink-900/8 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink-950">Leads & bookings</h2>
            <p className="mt-1 text-sm text-ink-500">Daily volume over the last 30 days.</p>
          </div>
          <Badge variant="outline">live</Badge>
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-signal-500" aria-hidden="true" /> Leads
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-relay-500" aria-hidden="true" /> Bookings
            </span>
          </div>
          <LeadsTrendChart data={summary.dailySeries} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-ink-950 p-5 text-white shadow-[0_24px_50px_-28px_rgba(17,27,35,0.7)] sm:p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Funnel</h2>
        <p className="mt-1 text-sm text-white/55">Leads by stage, scaled to the widest stage.</p>
        <div className="mt-6 space-y-5">
          {summary.funnel.map((stage, i) => {
            const pct = Math.round((stage.count / maxFunnelCount) * 100);
            return (
              <div key={stage.label}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="flex items-baseline gap-2 text-sm text-white/80">
                    <span className="font-mono text-[10px] text-white/35">0{i + 1}</span>
                    {stage.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-white/55">{stage.count}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-signal-500"
                    style={{ width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
