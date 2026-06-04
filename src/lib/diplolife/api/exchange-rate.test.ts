import { describe, expect, it, vi } from "vitest";
import {
  buildFxApiHistoryUrl,
  buildFxApiLatestUrl,
  buildCurrencyApiUrl,
  buildExchangeSimulationRows,
  calculateExchangeRateChangePercent,
  calculateExchangeTimingRecommendation,
  forecastExchangeRates,
  fetchExchangeRate,
  fetchHistoricalExchangeRateSeries,
  readExchangeRateHistoryCache,
  fetchExchangeRatePoint,
  writeExchangeRateHistoryCache,
  type ExchangeRateHistorySeries,
} from "./exchange-rate";

const makeStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const series: ExchangeRateHistorySeries = {
  baseCurrency: "KRW",
  targetCurrency: "JPY",
  cachedAt: "2026-05-31T00:00:00.000Z",
  source: "fxapi-app",
  points: [
    { date: "2026-05-27", rate: 0.1 },
    { date: "2026-05-28", rate: 0.102 },
    { date: "2026-05-29", rate: 0.104 },
    { date: "2026-05-30", rate: 0.106 },
  ],
};

describe("exchange-rate forecasting", () => {
  it("builds the date-addressed jsDelivr currency API URL for a base currency", () => {
    expect(
      buildCurrencyApiUrl({
        baseCurrency: "KRW",
        date: "2026-05-29",
      }),
    ).toBe(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-05-29/v1/currencies/krw.json",
    );
  });

  it("builds fxapi latest and history URLs for a currency pair", () => {
    expect(buildFxApiLatestUrl({ baseCurrency: "KRW", targetCurrency: "JPY" })).toBe(
      "https://fxapi.app/api/krw/jpy.json",
    );
    expect(
      buildFxApiHistoryUrl({
        baseCurrency: "KRW",
        fromDate: "2026-05-25",
        targetCurrency: "JPY",
        toDate: "2026-06-01",
      }),
    ).toBe("https://fxapi.app/api/history/krw/jpy.json?from=2026-05-25&to=2026-06-01");
  });

  it("parses a latest pair rate response from fxapi", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          base: "KRW",
          rate: 0.105198,
          target: "JPY",
          timestamp: "2026-06-01T04:00:38.538Z",
        }),
      ),
    );

    const point = await fetchExchangeRatePoint({
      baseCurrency: "KRW",
      targetCurrency: "JPY",
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(point).toEqual({ date: "2026-06-01", rate: 0.105198 });
    expect(fetcher).toHaveBeenCalledWith("https://fxapi.app/api/krw/jpy.json");
  });

  it("calculates the previous-day percentage move from actual rates", () => {
    expect(calculateExchangeRateChangePercent({ currentRate: 9.5, previousRate: 9.4 })).toBe(1.06);
    expect(calculateExchangeRateChangePercent({ currentRate: 9.4, previousRate: 9.5 })).toBe(-1.05);
    expect(calculateExchangeRateChangePercent({ currentRate: 9.5, previousRate: 0 })).toBeNull();
  });

  it("returns dashboard exchange-rate changePercent from the previous actual daily rate", async () => {
    const requestedUrls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      requestedUrls.push(url);

      if (url.includes("fxapi.app")) {
        return new Response(
          JSON.stringify({
            base: "JPY",
            rate: 9.5,
            target: "KRW",
            timestamp: "2026-06-02T04:00:38.538Z",
          }),
        );
      }

      return new Response(JSON.stringify({ date: "2026-06-01", jpy: { krw: 9.4 } }));
    });

    const result = await fetchExchangeRate("JPY", "KRW", {
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result).toMatchObject({
      baseCurrency: "KRW",
      changePercent: 1.06,
      rate: 9.5,
      targetCurrency: "JPY",
    });
    expect(requestedUrls).toEqual([
      "https://fxapi.app/api/jpy/krw.json",
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-06-01/v1/currencies/jpy.json",
    ]);
  });

  it("falls back to the date-addressed currency API for historical point lookup", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ date: "2026-05-29", krw: { jpy: 0.104 } })),
    );

    const point = await fetchExchangeRatePoint({
      baseCurrency: "KRW",
      targetCurrency: "JPY",
      date: "2026-05-29",
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(point).toEqual({ date: "2026-05-29", rate: 0.104 });
    expect(fetcher).toHaveBeenCalledWith(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-05-29/v1/currencies/krw.json",
    );
  });

  it("returns daily forecasts with internal error bands", () => {
    const forecast = forecastExchangeRates(series.points, {
      days: 3,
      windowSize: 3,
      startDate: "2026-05-30",
    });

    expect(forecast).toHaveLength(3);
    expect(forecast.map((point) => point.date)).toEqual([
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
    ]);
    expect(forecast[0].predictedRate).toBeGreaterThan(0.106);
    expect(forecast[0].lowerRate).toBeLessThanOrEqual(forecast[0].predictedRate);
    expect(forecast[0].upperRate).toBeGreaterThanOrEqual(forecast[0].predictedRate);
    expect(forecast[0].expectedErrorRate).toBeGreaterThanOrEqual(0);
  });

  it("forecasts percentage moves instead of additive rate deltas", () => {
    const compoundingSeries = Array.from({ length: 16 }, (_, index) => ({
      date: `2026-05-${String(index + 1).padStart(2, "0")}`,
      rate: Number((0.0004 * 1.1 ** index).toFixed(8)),
    }));
    const latestRate = compoundingSeries.at(-1)?.rate ?? 0;
    const forecast = forecastExchangeRates(compoundingSeries, {
      days: 7,
      startDate: "2026-05-16",
    });

    expect(forecast[6].predictedRate).toBeGreaterThan(latestRate * 1.7);
  });

  it("recommends waiting when a forecast date returns more target currency", () => {
    const recommendation = calculateExchangeTimingRecommendation({
      amount: 1_000_000,
      baseCurrency: "KRW",
      targetCurrency: "JPY",
      currentRate: 0.106,
      forecast: [
        { date: "2026-05-31", predictedRate: 0.105 },
        { date: "2026-06-01", predictedRate: 0.11 },
      ],
    });

    expect(recommendation.action).toBe("WAIT");
    expect(recommendation.bestDate).toBe("2026-06-01");
    expect(recommendation.todayTargetAmount).toBe(106_000);
    expect(recommendation.bestTargetAmount).toBe(110_000);
    expect(recommendation.differenceTargetAmount).toBe(4_000);
  });

  it("builds simulation rows for today, 1 day, 3 days, and 7 days with gain and loss labels", () => {
    const rows = buildExchangeSimulationRows({
      amount: 1_000_000,
      currentDate: "2026-05-31",
      currentRate: 0.000493,
      forecast: [
        { date: "2026-06-01", predictedRate: 0.000494 },
        { date: "2026-06-02", predictedRate: 0.000492 },
        { date: "2026-06-03", predictedRate: 0.000495 },
        { date: "2026-06-04", predictedRate: 0.000491 },
        { date: "2026-06-05", predictedRate: 0.000493 },
        { date: "2026-06-06", predictedRate: 0.000494 },
        { date: "2026-06-07", predictedRate: 0.000495 },
      ],
    });

    expect(rows.map((row) => row.label)).toEqual(["Today", "1 day", "3 days", "7 days"]);
    expect(rows.map((row) => row.targetAmount)).toEqual([493, 494, 495, 495]);
    expect(rows.map((row) => row.differenceFromToday)).toEqual([0, 1, 2, 2]);
    expect(rows.map((row) => row.judgment)).toEqual(["Current", "Slight gain", "Gain", "Gain"]);
    expect(rows.filter((row) => row.isBest).map((row) => row.label)).toEqual(["3 days", "7 days"]);
  });

  it("loads historical points from fxapi using the destination local date as the range end", async () => {
    const requestedUrls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      requestedUrls.push(url);

      return new Response(
        JSON.stringify({
          base: "KRW",
          target: "JPY",
          from: "2026-05-31",
          to: "2026-06-01",
          rates: [
            { date: "2026-05-31", rate: 0.105725 },
            { date: "2026-06-01", rate: 0.105198 },
          ],
        }),
      );
    });

    const result = await fetchHistoricalExchangeRateSeries({
      baseCurrency: "KRW",
      fetcher: fetcher as unknown as typeof fetch,
      historyDays: 2,
      now: new Date("2026-05-31T15:30:00.000Z"),
      targetCurrency: "JPY",
      timeZone: "Asia/Tokyo",
    });

    expect(requestedUrls).toEqual([
      "https://fxapi.app/api/history/krw/jpy.json?from=2026-05-31&to=2026-06-01",
    ]);
    expect(result).toMatchObject({
      baseCurrency: "KRW",
      source: "fxapi-app",
      targetCurrency: "JPY",
    });
    expect(result.points).toEqual([
      { date: "2026-05-31", rate: 0.105725 },
      { date: "2026-06-01", rate: 0.105198 },
    ]);
  });

  it("falls back to the currency API when fxapi history fails", async () => {
    const requestedUrls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      requestedUrls.push(url);
      if (url.includes("fxapi.app")) return new Response("unavailable", { status: 503 });

      const match = url.match(/currency-api@([^/]+)\//);
      const date = match?.[1] ?? "unknown";
      return new Response(JSON.stringify({ date, krw: { jpy: date.endsWith("01") ? 0.11 : 0.1 } }));
    });

    const result = await fetchHistoricalExchangeRateSeries({
      baseCurrency: "KRW",
      fetcher: fetcher as unknown as typeof fetch,
      historyDays: 2,
      now: new Date("2026-05-31T15:30:00.000Z"),
      targetCurrency: "JPY",
      timeZone: "Asia/Tokyo",
    });

    expect(requestedUrls[0]).toBe(
      "https://fxapi.app/api/history/krw/jpy.json?from=2026-05-31&to=2026-06-01",
    );
    expect(requestedUrls.slice(1)).toEqual([
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-05-31/v1/currencies/krw.json",
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-06-01/v1/currencies/krw.json",
    ]);
    expect(result.source).toBe("fawazahmed0-currency-api");
    expect(result.points).toEqual([
      { date: "2026-05-31", rate: 0.1 },
      { date: "2026-06-01", rate: 0.11 },
    ]);
  });

  it("reads cached history only while the destination local date is unchanged", () => {
    const storage = makeStorage();
    const key = "exchange-rate-history:KRW:JPY:30:Asia_Tokyo:2026-05-31";

    writeExchangeRateHistoryCache(storage, key, {
      ...series,
      cachedAt: "2026-05-31T14:50:00.000Z",
    });

    expect(
      readExchangeRateHistoryCache(storage, key, {
        now: new Date("2026-05-31T14:55:00.000Z"),
        timeZone: "Asia/Tokyo",
      }),
    ).not.toBeNull();

    expect(
      readExchangeRateHistoryCache(storage, key, {
        now: new Date("2026-05-31T15:01:00.000Z"),
        timeZone: "Asia/Tokyo",
      }),
    ).toBeNull();
  });
});
