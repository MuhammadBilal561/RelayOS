import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Security-relevant: this route is the ONLY thing standing between a logged-in
// dashboard user and being able to point their active-business cookie at a
// business owned by a different organization. It relies on RLS to hide
// out-of-org businesses, and it must NOT set the cookie in that case. These
// tests exercise the real GET handler against mocked Supabase.

const h = vi.hoisted(() => {
  const fromMock = vi.fn();
  const setCookieMock = vi.fn();
  return { fromMock, setCookieMock };
});

// The switch route imports ACTIVE_BUSINESS_COOKIE from lib/current-business.ts,
// which wraps functions in React's cache(). That binding isn't present in the
// node test env, so stub it as an identity function.
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));

// getServerSelectFor allows the test to control whether the requested
// business is visible (owned by the caller's org) via a mutable flag.
const visibleBusiness = { current: true as boolean };

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({
    from: (table: string) => h.fromMock(table),
  }),
}));

import { GET } from "./route";

const COOKIE = "relayos_active_business_id";

beforeEach(() => {
  h.fromMock.mockReset();
  h.setCookieMock.mockClear();
  visibleBusiness.current = true;
});

describe("GET /api/v1/businesses/switch", () => {
  it("redirects to /overview without setting a cookie when no businessId is provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/businesses/switch");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/overview");
    expect(h.fromMock).not.toHaveBeenCalled();
  });

  it("sets the active-business cookie when the requested business is found (owned by the org)", async () => {
    // The businesses query resolves with a row — meaning RLS exposed it,
    // i.e. it belongs to the caller's org.
    h.fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: "my_biz" }, error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost:3000/api/v1/businesses/switch?businessId=my_biz");
    const res = await GET(req);

    expect(h.fromMock).toHaveBeenCalledWith("businesses");
    expect(res.status).toBe(307);
    // The cookie must be set to the requested business.
    const setCookie = (res.headers.get("set-cookie") ?? "").toLowerCase();
    expect(setCookie).toContain(`${COOKIE}=my_biz`);
  });

  it("does NOT set the cookie when the business is not visible (belongs to another org / doesn't exist)", async () => {
    // RLS hides out-of-org rows: the query resolves with null.
    h.fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost:3000/api/v1/businesses/switch?businessId=rival_biz");
    const res = await GET(req);

    expect(res.status).toBe(307);
    // No active-business cookie should be set.
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeNull();
    // And it redirects safely to overview, not to the rival business.
    expect(res.headers.get("location")).toBe("http://localhost:3000/overview");
  });
});
