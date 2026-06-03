import { describe, expect, it } from "vitest";
import {
  getLocalDateKey,
  getMsUntilNextLocalDate,
  resolveExchangeRefreshTimeZone,
} from "./exchange-rate-refresh";

describe("exchange rate refresh timing", () => {
  it("resolves Japan selections to the Japan local time zone", () => {
    expect(resolveExchangeRefreshTimeZone({ city: "?꾩퓙", countryIso2: "JP" })).toBe(
      "Asia/Tokyo",
    );
  });

  it("calculates the cache date in the selected destination time zone", () => {
    expect(getLocalDateKey(new Date("2026-05-31T14:59:00.000Z"), "Asia/Tokyo")).toBe(
      "2026-05-31",
    );
    expect(getLocalDateKey(new Date("2026-05-31T15:00:00.000Z"), "Asia/Tokyo")).toBe(
      "2026-06-01",
    );
  });

  it("returns the delay until the next destination local date", () => {
    const delayMs = getMsUntilNextLocalDate({
      now: new Date("2026-05-31T14:59:30.000Z"),
      timeZone: "Asia/Tokyo",
    });

    expect(delayMs).toBeGreaterThanOrEqual(29_000);
    expect(delayMs).toBeLessThanOrEqual(31_000);
  });
});
