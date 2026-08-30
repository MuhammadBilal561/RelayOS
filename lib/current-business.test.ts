import { describe, it, expect, vi, beforeEach } from "vitest";

// lib/current-business.ts is the single most security-sensitive piece of
// the multi-tenant system: it decides which business a logged-in dashboard
// user is "in" based on a cookie, but must never trust that cookie to cross
// tenant boundaries. These tests prove the ownership re-check:
//   - a cookie pointing at a business owned by a DIFFERENT org is rejected,
//     and we fall back to the caller's own default business;
//   - a cookie pointing at the caller's own business is honored;
//   - with no cookie we fall back to the first business under the org.

// The module wraps its functions in React's cache(). In a node test env that
// binding isn't present, so stub it out as an identity function.
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));

// --- Mock next/headers (cookies) and next/navigation (redirect) -----------
const cookieValue = { current: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "relayos_active_business_id" && cookieValue.current
        ? { value: cookieValue.current }
        : undefined,
  }),
}));

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect(${path})`);
});
vi.mock("next/navigation", () => ({ redirect: (p: string) => redirect(p) }));

// --- Mock the server Supabase client --------------------------------------
// Each business carries its owning org so the mock can faithfully simulate
// Row Level Security: a query scoped to org X simply will not return rows
// whose organization_id is anything other than X. That is the mechanism the
// real code relies on to reject a cross-org cookie.
type BizRow = {
  id: string;
  name: string;
  public_widget_key: string;
  brand_color: string;
  organization_id: string;
  created_at: string;
};

const dbState = {
  orgId: undefined as string | undefined,
  businesses: [] as BizRow[],
};

const getUserMock = vi.fn();

// Build a chainable fake that records eq() filters so we can resolve the
// cookie-business query to a single row (or none) the way RLS would.
function buildChain(table: string) {
  const chain: Record<string, unknown> = {};
  const filters: Record<string, string> = {};
  let isOrdered = false;
  let isMaybeSingle = false;
  for (const m of ["select", "order", "limit", "single"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.eq = vi.fn((col: string, val: string) => {
    filters[col] = val;
    return chain;
  });
  chain.maybeSingle = vi.fn(() => {
    isMaybeSingle = true;
    return chain;
  });
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) => {
    if (table === "users") {
      return resolve({
        data: dbState.orgId ? { organization_id: dbState.orgId } : null,
        error: null,
      });
    }
    if (table === "businesses") {
      // Start from all businesses, then apply RLS (only caller's org visible).
      let rows = dbState.businesses.filter((b) => b.organization_id === dbState.orgId);
      // Apply the recorded eq() filters (id, organization_id, etc.).
      for (const [col, val] of Object.entries(filters)) {
        rows = rows.filter((b) => (b as unknown as Record<string, string>)[col] === val);
      }
      if (isOrdered) rows = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
      // maybeSingle resolves a single object (or null), matching Supabase's
      // .single()/.maybeSingle() return shape. Limit(1) also caps to one.
      const data = isMaybeSingle ? (rows[0] ?? null) : rows;
      return resolve({ data, error: null });
    }
    return resolve({ data: null, error: null });
  };
  return chain;
}

const fromMock = vi.fn((table: string) => buildChain(table));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { getCurrentBusiness, getBusinessesForCurrentUser, ACTIVE_BUSINESS_COOKIE } from "@/lib/current-business";

const bizA1: BizRow = {
  id: "orga_biz1",
  name: "Aurora HVAC",
  public_widget_key: "widget_a1",
  brand_color: "#F2A93B",
  organization_id: "org_a",
  created_at: "2026-08-01T00:00:00Z",
};
const bizA2: BizRow = {
  id: "orga_biz2",
  name: "Aurora Plumbing",
  public_widget_key: "widget_a2",
  brand_color: "#334155",
  organization_id: "org_a",
  created_at: "2026-08-02T00:00:00Z",
};
const bizB: BizRow = {
  id: "orgb_biz1",
  name: "Rival Dental",
  public_widget_key: "widget_b1",
  brand_color: "#0F766E",
  organization_id: "org_b",
  created_at: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  cookieValue.current = undefined;
  redirect.mockClear();
  getUserMock.mockClear();
  fromMock.mockClear();
  dbState.orgId = "org_a";
  dbState.businesses = [bizA1, bizA2, bizB];
  getUserMock.mockResolvedValue({ data: { user: { id: "user_1" } }, error: null });
});

describe("getCurrentBusiness — tenant isolation (the P0 check)", () => {
  it("rejects a cookie pointing at a business in a DIFFERENT org and falls back to the caller's first business", async () => {
    // Forged cookie claims orgb_biz1, which belongs to org_b. The caller is
    // in org_a. RLS hides org_b rows, so the ownership-checked query returns
    // nothing and we must fall back to the caller's own business.
    cookieValue.current = bizB.id;

    const result = await getCurrentBusiness();

    expect(result.id).not.toBe(bizB.id);
    expect(result.name).toBe("Aurora HVAC");
    expect(ACTIVE_BUSINESS_COOKIE).toBe("relayos_active_business_id");
  });

  it("honors a cookie pointing at a business the caller's org actually owns", async () => {
    cookieValue.current = bizA2.id;

    const result = await getCurrentBusiness();

    expect(result.id).toBe(bizA2.id);
    expect(result.name).toBe("Aurora Plumbing");
  });

  it("falls back to the first business under the org when no cookie is set", async () => {
    const result = await getCurrentBusiness();

    expect(result.id).toBe(bizA1.id);
    expect(result.name).toBe("Aurora HVAC");
  });

  it("redirects to /login when there is no authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getCurrentBusiness()).rejects.toThrow("redirect(/login)");
  });
});

describe("getBusinessesForCurrentUser", () => {
  it("returns only the caller's org businesses for the sidebar switcher", async () => {
    const list = await getBusinessesForCurrentUser();
    expect(list.map((b) => b.id)).toEqual([bizA1.id, bizA2.id]);
    expect(list.map((b) => b.id)).not.toContain(bizB.id);
  });

  it("returns an empty list when there is no logged-in user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const list = await getBusinessesForCurrentUser();
    expect(list).toEqual([]);
  });
});
