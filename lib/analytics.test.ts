import { describe, it, expect } from "vitest";
import {
  computeRevenueRecovered,
  computeAvgResponseSeconds,
  computeConversionRate,
  buildFunnel,
} from "@/lib/analytics";

describe("computeRevenueRecovered", () => {
  it("returns null when the business hasn't set an average job value yet", () => {
    expect(computeRevenueRecovered(10, null)).toBeNull();
  });

  it("returns null for a zero or negative job value rather than a misleading $0", () => {
    expect(computeRevenueRecovered(10, 0)).toBeNull();
    expect(computeRevenueRecovered(10, -50)).toBeNull();
  });

  it("multiplies bookings by the average job value", () => {
    expect(computeRevenueRecovered(12, 250)).toBe(3000);
  });

  it("rounds to the nearest cent", () => {
    expect(computeRevenueRecovered(3, 99.999)).toBe(300); // 3 * 99.999 = 299.997 → rounds to 300.00
    expect(computeRevenueRecovered(1, 19.995)).toBeCloseTo(20, 2);
  });

  it("is zero revenue for zero bookings, not null — a connected calendar with no bookings yet is a real, known state", () => {
    expect(computeRevenueRecovered(0, 250)).toBe(0);
  });
});

describe("computeAvgResponseSeconds", () => {
  it("returns null when there is no data yet", () => {
    expect(computeAvgResponseSeconds([])).toBeNull();
  });

  it("computes the average gap in whole seconds", () => {
    const pairs = [
      { visitorAt: "2026-01-01T00:00:00.000Z", assistantAt: "2026-01-01T00:00:02.000Z" }, // 2s
      { visitorAt: "2026-01-01T00:00:00.000Z", assistantAt: "2026-01-01T00:00:04.000Z" }, // 4s
    ];
    expect(computeAvgResponseSeconds(pairs)).toBe(3);
  });

  it("never returns a negative duration even with out-of-order timestamps", () => {
    const pairs = [{ visitorAt: "2026-01-01T00:00:05.000Z", assistantAt: "2026-01-01T00:00:00.000Z" }];
    expect(computeAvgResponseSeconds(pairs)).toBe(0);
  });

  it("ignores pairs where assistant responds before visitor", () => {
    const pairs = [
      { visitorAt: "2026-01-01T00:00:10.000Z", assistantAt: "2026-01-01T00:00:05.000Z" }, // -5s -> clamped to 0
      { visitorAt: "2026-01-01T00:00:00.000Z", assistantAt: "2026-01-01T00:00:10.000Z" }, // 10s
    ];
    // (0 + 10) / 2 = 5
    expect(computeAvgResponseSeconds(pairs)).toBe(5);
  });
});

describe("computeConversionRate", () => {
  it("returns null when there are no leads yet, instead of a misleading 0%", () => {
    expect(computeConversionRate(0, 0)).toBeNull();
  });

  it("computes a percentage to one decimal place", () => {
    expect(computeConversionRate(3, 1)).toBe(33.3);
  });

  it("is 100% when every lead booked", () => {
    expect(computeConversionRate(5, 5)).toBe(100);
  });
});

describe("buildFunnel", () => {
  it("produces mutually exclusive stage counts that sum to the total", () => {
    // 20 total leads: 8 still brand new, 7 qualified-but-not-booked, 5 booked.
    const funnel = buildFunnel({ new: 8, qualified: 7, booked: 5 });
    const total = funnel.reduce((sum, stage) => sum + stage.count, 0);

    expect(total).toBe(20);
    expect(funnel.map((s) => s.label)).toEqual(["New", "Qualified", "Booked"]);
  });

  it("handles an all-zero funnel without error", () => {
    const funnel = buildFunnel({ new: 0, qualified: 0, booked: 0 });
    expect(funnel.every((s) => s.count === 0)).toBe(true);
  });
});
