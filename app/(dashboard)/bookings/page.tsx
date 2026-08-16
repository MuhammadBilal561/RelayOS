import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusVariant = {
  confirmed: "live",
  completed: "neutral",
  cancelled: "escalated",
  no_show: "escalated",
} as const;

export default async function BookingsPage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("connected_email")
    .eq("business_id", business.id)
    .maybeSingle();

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status, lead_id")
    .eq("business_id", business.id)
    .order("start_time", { ascending: true });

  const leadIds = [...new Set((bookingRows ?? []).map((b) => b.lead_id))];
  const { data: leadRows } = leadIds.length
    ? await supabase.from("leads").select("id, name, email").in("id", leadIds)
    : { data: [] };
  const leadsById = new Map((leadRows ?? []).map((l) => [l.id, l]));

  const bookings = (bookingRows ?? []).map((b) => ({ ...b, lead: leadsById.get(b.lead_id) ?? null }));

  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-700/40">Bookings</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink-950">Upcoming appointments</h1>

      {!connection ? (
        <Card className="mt-6">
          <CardContent>
            <p className="text-sm font-medium text-ink-900">No calendar connected yet</p>
            <p className="mt-1 text-sm text-ink-700/60">
              Connect Google Calendar so the AI can check availability and book appointments automatically.
            </p>
            <Link
              href="/settings"
              className="mt-3 inline-block text-sm font-medium text-signal-600 underline underline-offset-4"
            >
              Go to Settings →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 divide-y divide-ink-800/10 rounded-xl border border-ink-800/10 bg-white shadow-panel">
          {bookings.length === 0 && (
            <p className="p-6 text-sm text-ink-700/60">
              No bookings yet — once the widget books an appointment, it'll show up here immediately.
            </p>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-ink-900">{b.lead?.name || b.lead?.email || "Lead"}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-700/60">
                  {new Date(b.start_time).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <Badge variant={statusVariant[b.status as keyof typeof statusVariant] ?? "neutral"}>{b.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
