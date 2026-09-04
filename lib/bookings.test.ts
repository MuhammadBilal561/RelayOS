import { describe, it, expect, vi, beforeEach } from "vitest";
describe("fetchBookingsForBusiness (read / refresh-equivalent)", () => {
  const storedRows = [
    {
      id: "booking_john",
      start_time: "2026-09-10T10:00:00.000Z",
      end_time: "2026-09-10T10:30:00.000Z",
      status: "confirmed",
      lead_id: "lead-john",
    },
    {
      id: "booking_ali",
      start_time: "2026-09-11T15:00:00.000Z",
      end_time: "2026-09-11T15:30:00.000Z",
      status: "confirmed",
      lead_id: "lead-ali",
    },
  ];

  function fakeClient(config: { bookings: { data: unknown; error: unknown }; leads?: { data: unknown; error: unknown } }) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve(config.bookings),
            in: () => Promise.resolve(config.leads ?? { data: [], error: null }),
          }),
        }),
      }),
    } as never;
  }

  it("BOOKING PERSISTENCE TEST: both John's and Ali's bookings are retrieved together", async () => {
    const client = fakeClient({
      bookings: { data: storedRows, error: null },
      leads: {
        data: [
          { id: "lead-john", name: "John", email: "jhon@test.com" },
          { id: "lead-ali", name: "Ali", email: "ali@test.com" },
        ],
        error: null,
      },
    });

    const bookings = await fetchBookingsForBusiness(client, "biz_1");

    expect(bookings).toHaveLength(2);
    const byId = new Map(bookings.map((b: BookingWithLead) => [b.id, b]));
    expect(byId.get("booking_john")?.lead?.name).toBe("John");
    expect(byId.get("booking_ali")?.lead?.name).toBe("Ali");
  });

  it("BOOKING REFRESH TEST: a fresh client fetch (page refresh equivalent) still returns prior records", async () => {
    // First "session": John is created and read back.
    const firstClient = fakeClient({
      bookings: { data: [storedRows[0]], error: null },
      leads: { data: [{ id: "lead-john", name: "John", email: "jhon@test.com" }], error: null },
    });
    const firstRead = await fetchBookingsForBusiness(firstClient, "biz_1");
    expect(firstRead.map((b) => b.id)).toEqual(["booking_john"]);

    // Second "session" (new server render / new browser session): the same
    // database now contains BOTH rows, and the fresh read returns both.
    const secondClient = fakeClient({
      bookings: { data: storedRows, error: null },
      leads: {
        data: [
          { id: "lead-john", name: "John", email: "jhon@test.com" },
          { id: "lead-ali", name: "Ali", email: "ali@test.com" },
        ],
        error: null,
      },
    });
    const secondRead = await fetchBookingsForBusiness(secondClient, "biz_1");
    expect(secondRead.map((b) => b.id)).toEqual(["booking_john", "booking_ali"]);
  });

  it("scopes the query to the given business_id", async () => {
    const eqSpy = vi.fn(() => ({ order: () => Promise.resolve({ data: storedRows, error: null }) }));
    const fromCalls: string[] = [];
    const leadBusinessEqSpy = vi.fn();
    const client = {
      from: (table: string) => {
        fromCalls.push(table);
        if (table === "leads") {
          return {
            select: () => ({
              eq: (field: string, value: string) => {
                leadBusinessEqSpy(field, value);
                return { in: () => Promise.resolve({ data: [], error: null }) };
              },
            }),
          };
        }
        return {
          select: () => ({
            eq: eqSpy,
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
    } as never;

    await fetchBookingsForBusiness(client, "biz_1");

    expect(fromCalls[0]).toBe("bookings");
    expect(eqSpy).toHaveBeenCalledWith("business_id", "biz_1");
    expect(leadBusinessEqSpy).toHaveBeenCalledWith("business_id", "biz_1");
  });

  it("throws on a bookings query failure instead of rendering a fake empty list", async () => {
    const client = fakeClient({ bookings: { data: null, error: { message: "permission denied" } } });

    await expect(fetchBookingsForBusiness(client, "biz_1")).rejects.toThrow(/Failed to load bookings/);
  });

  it("throws on a leads query failure instead of dropping lead names silently", async () => {
    const client = fakeClient({
      bookings: { data: storedRows, error: null },
      leads: { data: null, error: { message: "permission denied" } },
    });

    await expect(fetchBookingsForBusiness(client, "biz_1")).rejects.toThrow(/Failed to load booking contacts/);
  });

  it("returns an empty list when the business genuinely has no bookings", async () => {
    const client = fakeClient({ bookings: { data: [], error: null } });
    const bookings = await fetchBookingsForBusiness(client, "biz_1");
    expect(bookings).toEqual([]);
  });
});

/**
 * Tests for booking persistence:
 *   - create first booking (John)
 *   - create second booking (Ali)
 *   - retrieve both
 *   - refresh-equivalent read (a brand-new client/fetch still returns both)
 *   - database failure must throw (never a silent "success")
 *   - invalid business context (FK violation) must throw
 */

const chainResults = new Map<string, { data: unknown; error: unknown }>();
const insertSpy = vi.fn();

function createChain(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "single", "maybeSingle", "order", "in"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.insert = vi.fn((payload: unknown) => {
    insertSpy(table, payload);
    return chain;
  });
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve(chainResults.get(table) ?? { data: null, error: null });
  return chain;
}

const fromSpy = vi.fn((table: string) => createChain(table));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: fromSpy }),
}));

import { insertBooking } from "@/lib/server-data";
import { fetchBookingsForBusiness, type BookingWithLead } from "@/lib/bookings";

const JOHN_BOOKING = {
  lead_id: "lead-john",
  business_id: "biz_1",
  start_time: "2026-09-10T10:00:00.000Z",
  end_time: "2026-09-10T10:30:00.000Z",
  calendar_event_id: "gcal_john",
};

const ALI_BOOKING = {
  lead_id: "lead-ali",
  business_id: "biz_1",
  start_time: "2026-09-11T15:00:00.000Z",
  end_time: "2026-09-11T15:30:00.000Z",
  calendar_event_id: "gcal_ali",
};

beforeEach(() => {
  chainResults.clear();
  chainResults.set("leads", { data: { id: "lead-john" }, error: null });
  fromSpy.mockClear();
  insertSpy.mockClear();
});

describe("insertBooking (persistence)", () => {
  it("BOOKING PERSISTENCE TEST: creates John's booking, then Ali's booking — both rows are written to the bookings table", async () => {
    chainResults.set("bookings", { data: { id: "booking_john" }, error: null });

    const johnId = await insertBooking(JOHN_BOOKING);
    expect(johnId).toBe("booking_john");
    expect(insertSpy).toHaveBeenCalledWith("bookings", JOHN_BOOKING);

    chainResults.set("bookings", { data: { id: "booking_ali" }, error: null });
    const aliId = await insertBooking(ALI_BOOKING);
    expect(aliId).toBe("booking_ali");
    expect(insertSpy).toHaveBeenLastCalledWith("bookings", ALI_BOOKING);

    expect(insertSpy).toHaveBeenCalledTimes(2);
  });

  it("throws (never silently succeeds) when the database insert fails", async () => {
    chainResults.set("bookings", { data: null, error: { message: "duplicate key value violates unique constraint" } });

    await expect(insertBooking(JOHN_BOOKING)).rejects.toThrow(/Failed to insert booking/);
  });

  it("throws when the business context is invalid (FK violation on business_id)", async () => {
    chainResults.set("bookings", {
      data: null,
      error: { message: "insert or update on table 'bookings' violates foreign key constraint 'bookings_business_id_fkey'" },
    });

    await expect(
      insertBooking({ ...JOHN_BOOKING, business_id: "biz_does_not_exist" })
    ).rejects.toThrow(/violates foreign key/);
  });

  it("rejects a lead from another business before writing a booking row", async () => {
    chainResults.set("leads", { data: null, error: null });

    await expect(insertBooking(JOHN_BOOKING)).rejects.toThrow(/lead does not belong to business/);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("throws when the insert succeeds but the row cannot be read back (no false success)", async () => {
    chainResults.set("bookings", { data: null, error: { message: "something went wrong reading the row" } });

    await expect(insertBooking(JOHN_BOOKING)).rejects.toThrow(/Failed to insert booking/);
  });
});
