import Link from "next/link";
import { CalendarDays, CalendarClock, ArrowRight, AlertTriangle } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { fetchBookingsForBusiness, type BookingWithLead } from "@/lib/bookings";

import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/dashboard/section-header";
import { PageShell } from "@/components/dashboard/page-shell";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusVariant = {
  confirmed: "live",
  completed: "neutral",
  cancelled: "escalated",
  no_show: "escalated",
} as const;

const statusTone = {
  confirmed: "live",
  completed: "idle",
  cancelled: "escalated",
  no_show: "escalated",
} as const;

export default async function BookingsPage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: connection, error: connectionError } = await supabase
    .from("calendar_connections")
    .select("connected_email")
    .eq("business_id", business.id)
    .maybeSingle();

  let bookings: BookingWithLead[] = [];
  let loadError: string | null = connectionError ? "Failed to load calendar connection." : null;
  if (connectionError) {
    console.error("Bookings page failed to load calendar connection:", connectionError.message, {
      businessId: business.id,
    });
  }
  try {
    bookings = await fetchBookingsForBusiness(supabase, business.id);
  } catch (err) {
    console.error("Bookings page failed to load bookings:", err instanceof Error ? err.message : err, {
      businessId: business.id,
    });
    loadError = err instanceof Error ? err.message : "Failed to load bookings.";
  }

  const visibleBookings = bookings.filter((b) => b.status !== "cancelled" && b.status !== "no_show");

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Bookings"
        title="Appointments"
        description="Every appointment the widget has booked on your calendar, with its current status."
        actions={
          visibleBookings.length > 0 ? (
            <Badge variant="neutral">{visibleBookings.length} total</Badge>
          ) : undefined
        }
      />

      {loadError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-alert-500/20 bg-[#fdecec] px-4 py-3.5 text-sm text-alert-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Couldn&apos;t load your bookings</p>
            <p className="mt-0.5 text-xs leading-relaxed">{loadError}</p>
          </div>
        </div>
      )}

      <div className="mt-7">
        {connectionError ? (
          <div className="surface p-6">
            <p className="font-display text-base font-semibold text-ink-950">Calendar connection unavailable</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              We couldn&apos;t determine whether a calendar is connected. Please refresh and try again.
            </p>
          </div>
        ) : !connection ? (
          <div className="flex flex-col items-start gap-5 overflow-hidden rounded-2xl bg-ink-950 p-6 text-white shadow-[0_24px_50px_-28px_rgba(17,27,35,0.7)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-signal-400">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight">No calendar connected yet</p>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
                  Connect Google Calendar so the AI can check real availability and book appointments automatically.
                </p>
              </div>
            </div>
            <Link href="/settings#calendar">
              <Button variant="signal" size="sm">
                Connect Google Calendar
              </Button>
            </Link>
          </div>
        ) : visibleBookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No bookings yet"
            description="Once the widget books an appointment on your calendar, it&apos;ll show up here immediately — confirmed slots appear first, then completed ones."
          />
        ) : (
          <ul className="space-y-3">
            {visibleBookings.map((b) => {
              const statusKey = b.status as keyof typeof statusVariant;
              const isUpcoming = new Date(b.start_time).getTime() > Date.now();
              return (
                <li key={b.id} className={cn(!isUpcoming && "opacity-70")}>
                  <div className="surface flex items-center gap-4 p-4">
                    <Avatar name={b.lead?.name ?? b.lead?.email} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[15px] font-semibold text-ink-950">
                        {b.lead?.name || b.lead?.email || "Lead"}
                      </p>
                      <p className="mt-1 text-sm text-ink-500">{formatDateTime(b.start_time)}</p>
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        {isUpcoming ? `in ${formatRelativeTime(b.start_time)}` : "completed"}
                      </p>
                    </div>
                    <Badge
                      variant={statusVariant[statusKey] ?? "neutral"}
                      dot
                      dotTone={statusTone[statusKey] ?? "idle"}
                    >
                      {b.status}
                    </Badge>
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-ink-300 sm:block" aria-hidden="true" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
