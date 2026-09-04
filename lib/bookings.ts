import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Loads all bookings for a business (oldest by start time first is handled by
 * the caller's ordering) together with each booking's lead/contact.
 *
 * Takes the Supabase client as a parameter so dashboard pages can pass their
 * RLS-scoped server client, and unit tests can pass a fake — the query shape
 * is identical either way.
 *
 * Throws on query failure: a database error must surface as an error state in
 * the UI, never as an empty "no bookings yet" list that silently pretends the
 * persisted records vanished.
 */
export interface BookingWithLead {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  lead_id: string;
  lead: { id: string; name: string | null; email: string | null } | null;
}

type QueryClient = Pick<SupabaseClient<Database>, "from">;

export async function fetchBookingsForBusiness(
  client: QueryClient,
  businessId: string
): Promise<BookingWithLead[]> {
  const { data: bookingRows, error: bookingError } = await client
    .from("bookings")
    .select("id, start_time, end_time, status, lead_id")
    .eq("business_id", businessId)
    .order("start_time", { ascending: true });

  if (bookingError) {
    throw new Error(`Failed to load bookings: ${bookingError.message}`);
  }

  const rows = bookingRows ?? [];
  const leadIds = [...new Set(rows.map((b) => b.lead_id))];
  const leadsById = new Map<string, { id: string; name: string | null; email: string | null }>();

  if (leadIds.length > 0) {
    const { data: leadRows, error: leadError } = await client
      .from("leads")
      .select("id, name, email")
      .eq("business_id", businessId)
      .in("id", leadIds);

    if (leadError) {
      throw new Error(`Failed to load booking contacts: ${leadError.message}`);
    }
    for (const l of leadRows ?? []) {
      leadsById.set(l.id, l);
    }
  }

  return rows.map((b) => ({
    ...b,
    lead: leadsById.get(b.lead_id) ?? null,
  }));
}
