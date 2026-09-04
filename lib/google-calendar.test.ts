import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";

// The Calendar adapter reads Google OAuth env vars at call time. Vitest does
// not load .env.local automatically, so provide placeholder (non-empty) values
// here — the tests mock the OAuth client itself, so these never reach Google.
const GOOGLE_ENV = {
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GOOGLE_REDIRECT_URI: "http://localhost:3000/api/integrations/google-calendar/callback",
};
const savedGoogleEnv = { ...GOOGLE_ENV };

const TEST_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
let savedEncryptionKey: string | undefined;

// Pre-compute encrypted test tokens using the same logic as lib/crypto.ts
function encryptTestToken(plaintext: string): string {
  const ALGORITHM = "aes-256-gcm";
  const IV_LENGTH = 12;
  const AUTH_TAG_LENGTH = 16;
  const VERSION_PREFIX = "v1:";

  const key = Buffer.from(TEST_ENCRYPTION_KEY, "hex");
  const iv = Buffer.alloc(IV_LENGTH, 0); // deterministic IV for tests
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encoded = Buffer.concat([iv, ciphertext, authTag]).toString("base64");
  return VERSION_PREFIX + encoded;
}

const { createCipheriv } = await import("node:crypto");

const ENCRYPTED_AT = encryptTestToken("at");
const ENCRYPTED_RT = encryptTestToken("rt");

beforeAll(() => {
  savedEncryptionKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

  savedGoogleEnv.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
  savedGoogleEnv.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
  savedGoogleEnv.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "";
  process.env.GOOGLE_CLIENT_ID = GOOGLE_ENV.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = GOOGLE_ENV.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_REDIRECT_URI = GOOGLE_ENV.GOOGLE_REDIRECT_URI;
});

afterAll(() => {
  if (savedEncryptionKey) {
    process.env.ENCRYPTION_KEY = savedEncryptionKey;
  } else {
    delete process.env.ENCRYPTION_KEY;
  }
  process.env.GOOGLE_CLIENT_ID = savedGoogleEnv.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = savedGoogleEnv.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_REDIRECT_URI = savedGoogleEnv.GOOGLE_REDIRECT_URI;
});

// lib/google-calendar.ts is the booking engine's Calendar adapter. It had no
// direct tests — only the agent-tool layer (lib/ai/tools.test.ts) exercised a
// fully-mocked version. These tests target the two pure-ish entry points:
//   - checkAvailability(): the forward-scanning "suggest next open slot" logic
//   - getGoogleAuthUrl(): the OAuth URL builder and that it carries businessId in state

// Use vi.hoisted so the mocks exist before the hoisted vi.mock factory runs.
const h = vi.hoisted(() => {
  const generateAuthUrlMock = vi.fn();
  const freebusyQueryMock = vi.fn();
  const getTokenMock = vi.fn();

  class FakeOAuth2Client {
    generateAuthUrl(opts: { state: string; access_type: string }) {
      generateAuthUrlMock(opts);
      return `https://accounts.google.com/o/oauth2/auth?state=${encodeURIComponent(opts.state)}`;
    }
    setCredentials(_c: unknown) {}
    on(_event: string, _cb: unknown) {}
    getToken(code: string) {
      return getTokenMock(code);
    }
  }

  return { generateAuthUrlMock, freebusyQueryMock, getTokenMock, FakeOAuth2Client };
});

// google.calendar({ version: "v3" }) returns an object whose methods
// (freebusy, events, ...) are at the top level — the version is applied
// internally, not as a nested `.v3` key. Patch the mock to match that shape.
const fakeCalendar = {
  freebusy: { query: (args: unknown) => h.freebusyQueryMock(args) },
  events: { insert: vi.fn() },
};

vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: h.FakeOAuth2Client },
    calendar: () => fakeCalendar,
  },
}));

// --- Mock the service-role Supabase client --------------------------------
// checkAvailability reads the business's calendar_connections row.
const chainResults = new Map<string, { data: unknown; error: unknown }>();
const fromSpy = vi.fn((table: string) => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit", "single", "maybeSingle", "upsert"]) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve(chainResults.get(table) ?? { data: null, error: null });
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: fromSpy }),
}));

import { checkAvailability, getGoogleAuthUrl, connectGoogleCalendar } from "@/lib/google-calendar";

const BUSINESS = "679f7f98-96a3-4ab8-b3f8-23b25d1dcc27";

function tokenConn(overrides: Record<string, unknown> = {}) {
  return {
    access_token: ENCRYPTED_AT,
    refresh_token: ENCRYPTED_RT,
    token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    calendar_id: "primary",
    ...overrides,
  };
}

beforeEach(() => {
  chainResults.clear();
  fromSpy.mockClear();
  h.freebusyQueryMock.mockReset();
  h.generateAuthUrlMock.mockReset();
  h.getTokenMock.mockReset();
  chainResults.set("calendar_connections", { data: tokenConn(), error: null });
});

describe("checkAvailability", () => {
  it("rejects invalid dates and durations before calling Google", async () => {
    await expect(checkAvailability(BUSINESS, "not-a-date")).rejects.toThrow(/valid ISO/);
    await expect(checkAvailability(BUSINESS, "2026-08-03T15:00:00Z", 0)).rejects.toThrow(/between 1 and 1440/);
    expect(h.freebusyQueryMock).not.toHaveBeenCalled();
  });

  it("returns not-connected when the business has no calendar connection", async () => {
    chainResults.set("calendar_connections", { data: null, error: null });

    const result = await checkAvailability(BUSINESS, "2026-08-03T15:00:00-05:00");

    expect(result).toEqual({ connected: false, available: false });
    expect(h.freebusyQueryMock).not.toHaveBeenCalled();
  });

  it("returns available=true when freebusy reports the slot is free", async () => {
    h.freebusyQueryMock.mockResolvedValue({ data: { calendars: { primary: { busy: [] } } } });

    const result = await checkAvailability(BUSINESS, "2026-08-03T15:00:00-05:00");

    // The caller's "3pm Central" input normalizes to 20:00 UTC.
    expect(result).toEqual({
      connected: true,
      available: true,
      suggestedStartIso: "2026-08-03T20:00:00.000Z",
    });
  });

  it("scans forward and suggests the next open slot when the requested slot is busy", async () => {
    let callCount = 0;
    h.freebusyQueryMock.mockImplementation(async (args: { requestBody: { timeMin: string; timeMax: string } }) => {
      callCount += 1;
      // 3pm CT = 20:00 UTC is busy; the next 30-min step (8:30pm UTC) is free.
      const busy =
        args.requestBody.timeMin === "2026-08-03T20:00:00.000Z"
          ? [{ start: "2026-08-03T20:00:00.000Z", end: "2026-08-03T20:30:00.000Z" }]
          : [];
      return { data: { calendars: { primary: { busy } } } };
    });

    const result = await checkAvailability(BUSINESS, "2026-08-03T15:00:00-05:00", 30);

    expect(result.available).toBe(false);
    expect(result.connected).toBe(true);
    // The suggested start must be the next free slot (15:30 CT = 20:30 UTC).
    expect(result.suggestedStartIso).toBe("2026-08-03T20:30:00.000Z");
    expect(callCount).toBe(2);
  });

  it("stops scanning after 8 attempts and reports unavailable if nothing opens up", async () => {
    h.freebusyQueryMock.mockResolvedValue({
      data: { calendars: { primary: { busy: [{ start: "x", end: "y" }] } } },
    });

    const result = await checkAvailability(BUSINESS, "2026-08-03T15:00:00-05:00");

    expect(result).toEqual({ connected: true, available: false });
    expect(h.freebusyQueryMock).toHaveBeenCalledTimes(8);
  });
});

describe("getGoogleAuthUrl", () => {
  it("carries the business id in the OAuth state so the callback can attach tokens to the right business", () => {
    const url = getGoogleAuthUrl("business_123");

    expect(url).toContain("state=business_123");
    expect(h.generateAuthUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        access_type: "offline",
        prompt: "consent",
        state: "business_123",
      })
    );
  });

  it("throws when the Google env vars are missing", () => {
    const saved = {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect: process.env.GOOGLE_REDIRECT_URI,
    };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;

    try {
      expect(() => getGoogleAuthUrl("b")).toThrow(/GOOGLE_CLIENT_ID/);
    } finally {
      process.env.GOOGLE_CLIENT_ID = saved.id;
      process.env.GOOGLE_CLIENT_SECRET = saved.secret;
      process.env.GOOGLE_REDIRECT_URI = saved.redirect;
    }
  });
});

describe("connectGoogleCalendar", () => {
  it("stores the tokens returned by Google for the business", async () => {
    h.getTokenMock.mockResolvedValue({
      tokens: {
        access_token: "at_code",
        refresh_token: "rt_code",
        expiry_date: Date.now() + 3600_000,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ email: "owner@example.com", email_verified: "true" }),
      }))
    );

    await connectGoogleCalendar("biz_abc", "the_code");

    expect(h.getTokenMock).toHaveBeenCalledWith("the_code");
    const tablesQueried = fromSpy.mock.calls.map((c) => c[0]);
    expect(tablesQueried).toContain("calendar_connections");
    vi.unstubAllGlobals();
  });

  it("does not fall back to plaintext when token encryption is unavailable", async () => {
    h.getTokenMock.mockResolvedValue({
      tokens: { access_token: "at_code", refresh_token: "rt_code", expiry_date: Date.now() + 3600_000 },
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    const previousKey = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      await expect(connectGoogleCalendar("biz_abc", "the_code")).rejects.toThrow(/ENCRYPTION_KEY/);
    } finally {
      process.env.ENCRYPTION_KEY = previousKey;
      vi.unstubAllGlobals();
    }
  });
});

describe("legacy plaintext token compatibility", () => {
  it("reads plaintext tokens without throwing (decrypted as plaintext)", async () => {
    chainResults.set("calendar_connections", {
      data: { access_token: "plaintext_at", refresh_token: "plaintext_rt", token_expires_at: new Date(Date.now() + 3600_000).toISOString(), calendar_id: "primary" },
      error: null,
    });
    h.freebusyQueryMock.mockResolvedValue({ data: { calendars: { primary: { busy: [] } } } });

    const result = await checkAvailability(BUSINESS, "2026-08-03T15:00:00-05:00");

    expect(result.connected).toBe(true);
    expect(result.available).toBe(true);
  });
});
