import Link from "next/link";
import { CalendarDays, CalendarClock, ArrowRight, AlertTriangle } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { fetchBookingsForBusiness, type BookingWithLead } from "@/lib/bookings";

import { Card, CardContent } from "@/components/ui/card";
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
          className="mt-6 flex items-start gap-3 rounded-xl border border-alert-500/25 bg-alert-500/10 px-4 py-3 text-sm text-alert-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Couldn't load your bookings</p>
            <p className="mt-0.5 text-xs leading-relaxed">{loadError}</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {connectionError ? (
          <Card className="mt-2">
            <CardContent className="px-6 py-8">
              <p className="text-sm font-medium text-ink-900">Calendar connection unavailable</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                We couldn't determine whether a calendar is connected. Please refresh and try again.
              </p>
            </CardContent>
          </Card>
        ) : !connection ? (
          <Card className="mt-2">
            <CardContent className="flex flex-col items-start gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-signal-500/10 text-signal-700">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold tracking-tight text-ink-950">
                    No calendar connected yet
                  </p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-500">
                    Connect Google Calendar so the AI can check real availability and book
                    appointments automatically.
                  </p>
                </div>
              </div>
              <Link href="/settings#calendar">
                <Button variant="signal" size="sm">
                  Connect Google Calendar
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : visibleBookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No bookings yet"
            description="Once the widget books an appointment on your calendar, it'll show up here immediately — confirmed slots appear first, then completed ones."
          />
        ) : (
          <>
            <div className="surface hidden overflow-hidden md:block">
              <div className="overflow-x-auto scroll-thin" role="region" aria-label="Bookings table" tabIndex={0}>
                <table className="dash-table w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="border-b border-ink-900/[0.07]">
                      <th scope="col" className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        Lead
                      </th>
                      <th scope="col" className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        Date & time
                      </th>
                      <th scope="col" className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        Status
                      </th>
                      <th scope="col" className="w-8 px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/[0.05]">
                    {visibleBookings.map((b) => {
                      const isUpcoming = new Date(b.start_time).getTime() > Date.now();
                      const statusKey = b.status as keyof typeof statusVariant;
                      return (
                        <tr
                          key={b.id}
                          className={cn(
                            "group",
                            !isUpcoming && "opacity-70"
                          )}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={b.lead?.name ?? b.lead?.email} />
                              <span className="text-sm font-medium text-ink-900">
                                {b.lead?.name || b.lead?.email || "Lead"}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <p className="text-sm font-medium text-ink-900">{formatDateTime(b.start_time)}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-ink-300">
                              {isUpcoming ? `in ${formatRelativeTime(b.start_time)}` : "completed"}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <Badge
                              variant={statusVariant[statusKey] ?? "neutral"}
                              dot
                              dotTone={statusTone[statusKey] ?? "idle"}
                            >
                              {b.status}
                            </Badge>
                          </td>
                          <td className="px-3">
                            <ArrowRight className="h-4 w-4 text-ink-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-signal-600" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <ul className="space-y-2 md:hidden">
              {visibleBookings.map((b) => {
                const statusKey = b.status as keyof typeof statusVariant;
                const isUpcoming = new Date(b.start_time).getTime() > Date.now();
                return (
                  <li key={b.id} className={cn(!isUpcoming && "opacity-70")}>
                    <div className="surface flex items-center gap-3 p-3.5">
                      <Avatar name={b.lead?.name ?? b.lead?.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {b.lead?.name || b.lead?.email || "Lead"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-400">{formatDateTime(b.start_time)}</p>
                      </div>
                      <Badge variant={statusVariant[statusKey] ?? "neutral"} dot dotTone={statusTone[statusKey] ?? "idle"}>
                        {b.status}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </PageShell>
  );
}
