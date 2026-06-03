import { describe, expect, it } from "vitest";
import {
  createExchangeForecastClientCacheKey,
  readHydratedExchangeForecastClientCache,
  readExchangeForecastClientCache,
  writeExchangeForecastClientCache,
} from "./exchange-forecast-client-cache";
import type { ExchangeRateForecastResult } from "./api/exchange-rate";

const createMemoryStorage = () => {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
      storage.set(`deleted:${key}`, "true");
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    wasDeleted: (key: string) => storage.get(`deleted:${key}`) === "true",
  };
};

const forecastResult: ExchangeRateForecastResult = {
  amount: 1,
  baseCurrency: "KRW",
  cache: {
    hit: false,
    key: "server-key",
    refreshDate: "2026-05-31",
    refreshTimeZone: "Europe/London",
    ttlHours: 1 / 6,
  },
  fetchedAt: "2026-05-31T00:00:00.000Z",
  forecast: [],
  history: [{ date: "2026-05-31", rate: 0.00055 }],
  recommendation: {
    action: "TODAY",
    baseCurrency: "KRW",
    bestDate: "today",
    bestPredictedRate: 0.00055,
    bestTargetAmount: 0.00055,
    currentRate: 0.00055,
    differenceTargetAmount: 0,
    targetCurrency: "GBP",
    todayTargetAmount: 0.00055,
  },
  source: "fawazahmed0-currency-api",
  targetCurrency: "GBP",
};

describe("exchange forecast client cache", () => {
  it("includes the destination time zone and local date in the cache key", () => {
    expect(
      createExchangeForecastClientCacheKey({
        baseCurrency: "krw",
        historyDays: 30,
        refreshDate: "2026-06-01",
        refreshTimeZone: "Asia/Tokyo",
        targetCurrency: "jpy",
      }),
    ).toBe("exchange-rate-forecast-client:KRW:JPY:30:Asia_Tokyo:2026-06-01");
  });

  it("reuses a forecast result while it is inside the short fxapi TTL", () => {
    const storage = createMemoryStorage();
    const key = createExchangeForecastClientCacheKey({
      baseCurrency: "KRW",
      historyDays: 30,
      refreshDate: "2026-05-31",
      refreshTimeZone: "Europe/London",
      targetCurrency: "GBP",
    });

    writeExchangeForecastClientCache(storage, key, forecastResult, {
      cachedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(
      readExchangeForecastClientCache(storage, key, {
        now: new Date("2026-05-31T00:09:00.000Z"),
        timeZone: "Europe/London",
      })?.data,
    ).toEqual(forecastResult);
  });

  it("drops a forecast result after the short fxapi TTL expires", () => {
    const storage = createMemoryStorage();
    const key = createExchangeForecastClientCacheKey({
      baseCurrency: "KRW",
      historyDays: 30,
      refreshDate: "2026-05-31",
      refreshTimeZone: "Europe/London",
      targetCurrency: "GBP",
    });

    writeExchangeForecastClientCache(storage, key, forecastResult, {
      cachedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(
      readExchangeForecastClientCache(storage, key, {
        now: new Date("2026-05-31T00:11:00.000Z"),
        timeZone: "Europe/London",
      }),
    ).toBeNull();
    expect(storage.wasDeleted(key)).toBe(true);
  });

  it("drops a forecast result after the destination local date changes", () => {
    const storage = createMemoryStorage();
    const key = createExchangeForecastClientCacheKey({
      baseCurrency: "KRW",
      historyDays: 30,
      refreshDate: "2026-05-31",
      refreshTimeZone: "Europe/London",
      targetCurrency: "GBP",
    });

    writeExchangeForecastClientCache(storage, key, forecastResult, {
      cachedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(
      readExchangeForecastClientCache(storage, key, {
        now: new Date("2026-05-31T23:01:00.000Z"),
        timeZone: "Europe/London",
      }),
    ).toBeNull();
    expect(storage.wasDeleted(key)).toBe(true);
  });

  it("does not expose cached browser data before hydration", () => {
    const storage = createMemoryStorage();
    const key = createExchangeForecastClientCacheKey({
      baseCurrency: "KRW",
      historyDays: 30,
      refreshDate: "2026-05-31",
      refreshTimeZone: "Europe/London",
      targetCurrency: "GBP",
    });

    writeExchangeForecastClientCache(storage, key, forecastResult, {
      cachedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(
      readHydratedExchangeForecastClientCache(storage, key, {
        isHydrated: false,
        now: new Date("2026-05-31T00:05:00.000Z"),
        timeZone: "Europe/London",
      }),
    ).toBeNull();
    expect(
      readHydratedExchangeForecastClientCache(storage, key, {
        isHydrated: true,
        now: new Date("2026-05-31T00:05:00.000Z"),
        timeZone: "Europe/London",
      })?.data,
    ).toEqual(forecastResult);
  });
});
