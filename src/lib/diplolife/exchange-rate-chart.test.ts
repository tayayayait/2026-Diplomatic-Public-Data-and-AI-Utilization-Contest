import { describe, expect, it } from "vitest";
import {
  buildExchangeRateChartData,
  getExchangeRateDataFreshness,
} from "./exchange-rate-chart";
import type { ExchangeRateForecastResult } from "./api/exchange-rate";

const result: ExchangeRateForecastResult = {
  amount: 1,
  baseCurrency: "KRW",
  cache: {
    hit: false,
    key: "server-key",
    refreshDate: "2026-06-01",
    refreshTimeZone: "Asia/Tokyo",
    ttlHours: 24,
  },
  fetchedAt: "2026-06-01T00:10:00.000+09:00",
  forecast: [
    {
      date: "2026-06-02",
      expectedErrorRate: 0.001,
      lowerRate: 0.1,
      predictedRate: 0.106,
      upperRate: 0.11,
    },
    {
      date: "2026-06-04",
      expectedErrorRate: 0.001,
      lowerRate: 0.1,
      predictedRate: 0.108,
      upperRate: 0.11,
    },
  ],
  history: [
    { date: "2026-05-30", rate: 0.102 },
    { date: "2026-06-01", rate: 0.105 },
  ],
  recommendation: {
    action: "WAIT",
    baseCurrency: "KRW",
    bestDate: "2026-06-04",
    bestPredictedRate: 0.108,
    bestTargetAmount: 0.108,
    currentRate: 0.105,
    differenceTargetAmount: 0.003,
    targetCurrency: "JPY",
    todayTargetAmount: 0.105,
  },
  source: "fawazahmed0-currency-api",
  targetCurrency: "JPY",
};

describe("exchange rate chart data", () => {
  it("bridges the forecast line from the latest actual point", () => {
    const chartData = buildExchangeRateChartData(result);

    expect(chartData).toEqual([
      { actual: 0.102, date: "2026-05-30", label: "05/30", predicted: null },
      { actual: 0.105, date: "2026-06-01", label: "06/01", predicted: 0.105 },
      { actual: null, date: "2026-06-02", label: "06/02", predicted: 0.106 },
      { actual: null, date: "2026-06-04", label: "06/04", predicted: 0.108 },
    ]);
  });

  it("distinguishes stale latest actual data from the destination local date", () => {
    expect(
      getExchangeRateDataFreshness({
        latestActualDate: "2026-05-31",
        refreshDate: "2026-06-01",
      }),
    ).toEqual({
      isLatestActualForRefreshDate: false,
      rateCardDescription: "?꾩? ?ㅻ뒛 2026-06-01 ?ㅼ륫 誘몄젣怨?쨌 理쒖떊 ?ㅼ륫 2026-05-31",
      rateCardTitle: "理쒖떊 ?ㅼ륫 ?섏쑉",
    });
  });
});
