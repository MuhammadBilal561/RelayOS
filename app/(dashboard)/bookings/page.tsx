import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/dashboard/section-header";

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
      <SectionHeader
        eyebrow="Bookings"
        title="Upcoming appointments"
      />

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
        <div className="mt-6">
          <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0" role="region" aria-label="Bookings table" tabIndex={0}>
            <table className="w-full min-w-[600px]" role="table">
              <thead>
                <tr className="border-b border-ink-800/10">
                  <th className="sticky left-0 z-10 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-700/50 bg-ink-950/50" scope="col">Lead</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-700/50" scope="col">Date & Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-700/50" scope="col">Status</th>
                  <th className="w-1" scope="col"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/10">
                {bookings.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-ink-700/60" colSpan={4}>
                      No bookings yet — once the widget books an appointment, it'll show up here immediately.
                    </td>
                  </tr>
                )}
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-paper-50">
                    <td className="sticky left-0 z-10 px-5 py-4 bg-white bg-opacity-95 backdrop-blur-sm">
                      <p className="text-sm font-medium text-ink-900">{b.lead?.name || b.lead?.email || "Lead"}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-ink-700/60">
                      {new Date(b.start_time).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant={statusVariant[b.status as keyof typeof statusVariant] ?? "neutral"}>{b.status}</Badge>
                    </td>
                    <td className="w-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-center text-ink-700/40 md:hidden">← Swipe to scroll →</p>
        </div>
      )}
    </div>
  );
}
