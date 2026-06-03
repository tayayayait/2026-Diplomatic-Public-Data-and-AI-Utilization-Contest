import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  EXCHANGE_REFRESH_FALLBACK_TIME_ZONE,
  getLocalDateKey,
  normalizeTimeZoneSegment,
} from "../exchange-rate-refresh";

export type ExchangeRateInfo = {
  baseCurrency: string; // ?? KRW
  targetCurrency: string; // ?? JPY, USD
  rate: number; // 1 ?寃??듯솕 ??湲곗? ?듯솕 (?? 1 USD = 1400 KRW)
  changePercent: number | null;
  fetchedAt: string;
};

export interface ExchangeRatePoint {
  date: string;
  rate: number; // 1 baseCurrency ??targetCurrency ?섎웾
}

export interface ExchangeRateForecastPoint {
  date: string;
  predictedRate: number;
  expectedErrorRate: number;
  lowerRate: number;
  upperRate: number;
}

export interface ExchangeRateHistorySeries {
  baseCurrency: string;
  targetCurrency: string;
  cachedAt: string;
  source: ExchangeRateSource;
  points: ExchangeRatePoint[];
}

export interface ExchangeTimingRecommendation {
  action: "TODAY" | "WAIT";
  baseCurrency: string;
  targetCurrency: string;
  bestDate: string;
  currentRate: number;
  bestPredictedRate: number;
  todayTargetAmount: number;
  bestTargetAmount: number;
  differenceTargetAmount: number;
}

export interface ExchangeSimulationRow {
  label: "Today" | "1 day" | "3 days" | "7 days";
  date: string;
  rate: number;
  targetAmount: number;
  differenceFromToday: number;
  judgment: "Current" | "No change" | "Slight gain" | "Gain" | "Slight loss" | "Loss";
  isBest: boolean;
}

export interface ExchangeRateForecastResult {
  baseCurrency: string;
  targetCurrency: string;
  amount: number;
  history: ExchangeRatePoint[];
  forecast: ExchangeRateForecastPoint[];
  recommendation: ExchangeTimingRecommendation;
  fetchedAt: string;
  source: ExchangeRateHistorySeries["source"];
  cache: {
    hit: boolean;
    key: string;
    refreshDate: string;
    refreshTimeZone: string;
    ttlHours: number;
  };
}

export interface ExchangeRateCacheStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

export type ExchangeRateSource = "fxapi-app" | "fawazahmed0-currency-api";

export const EXCHANGE_RATE_SOURCE = "fxapi-app" as const;
export const EXCHANGE_RATE_FALLBACK_SOURCE = "fawazahmed0-currency-api" as const;
export const EXCHANGE_HISTORY_DAYS = 30;
export const EXCHANGE_FORECAST_DAYS = 7;
export const EXCHANGE_CACHE_TTL_MS = 10 * 60 * 1000;

export const exchangeCurrencyOptions = [
  "KRW",
  "USD",
  "JPY",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "CNY",
  "HKD",
  "SGD",
  "THB",
  "VND",
  "PHP",
  "TWD",
] as const;

type ExchangeCurrencyCode = (typeof exchangeCurrencyOptions)[number];

// 二쇱슂 援?? ISO2 -> ?듯솕 肄붾뱶 留ㅽ븨
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  JP: "JPY",
  US: "USD",
  TH: "THB",
  VN: "VND",
  PH: "PHP",
  CN: "CNY",
  TW: "TWD",
  GB: "GBP",
  EU: "EUR",
  FR: "EUR",
  DE: "EUR",
  IT: "EUR",
  ES: "EUR",
  AU: "AUD",
  NZ: "NZD",
  CA: "CAD",
  SG: "SGD",
  HK: "HKD",
};

const serverHistoryCache = new Map<string, string>();

const serverCacheStorage: ExchangeRateCacheStorage = {
  getItem: (key) => serverHistoryCache.get(key) ?? null,
  setItem: (key, value) => {
    serverHistoryCache.set(key, value);
  },
  removeItem: (key) => {
    serverHistoryCache.delete(key);
  },
};

const exchangeForecastInputSchema = z.object({
  amount: z.number().positive().max(1_000_000_000_000),
  baseCurrency: z.string().min(3).max(3),
  targetCurrency: z.string().min(3).max(3),
  historyDays: z.number().int().min(7).max(90).optional(),
  refreshTimeZone: z.string().min(1).max(64).optional(),
});

const normalizeCurrencyCode = (currency: string) => currency.trim().toUpperCase();

const roundRate = (value: number) => Number(value.toFixed(8));

const roundAmount = (value: number) => Number(value.toFixed(2));

const MIN_EXCHANGE_RATE = 0.00000001;
const EWMA_DECAY = 0.94;
const FORECAST_CANDIDATE_NAMES = [
  "randomWalk",
  "ewmaLogReturn",
  "shortMomentum",
  "meanReversion",
] as const;

type ForecastCandidateName = (typeof FORECAST_CANDIDATE_NAMES)[number];
type ForecastCandidateRates = Record<ForecastCandidateName, number>;
type ForecastModelErrors = Record<ForecastCandidateName, number>;
type ForecastModelWeights = Record<ForecastCandidateName, number>;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const isIsoDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const addUtcDays = (isoDate: string, days: number): string => {
  const timestamp = Date.parse(`${isoDate}T00:00:00.000Z`);
  const next = new Date(timestamp + days * 24 * 60 * 60 * 1000);

  return toIsoDate(next);
};

export function buildCurrencyApiUrl({
  baseCurrency,
  date = "latest",
}: {
  baseCurrency: string;
  date?: string;
}): string {
  return `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${normalizeCurrencyCode(baseCurrency).toLowerCase()}.json`;
}

export function buildFxApiLatestUrl({
  baseCurrency,
  targetCurrency,
}: {
  baseCurrency: string;
  targetCurrency: string;
}) {
  return `https://fxapi.app/api/${normalizeCurrencyCode(baseCurrency).toLowerCase()}/${normalizeCurrencyCode(targetCurrency).toLowerCase()}.json`;
}

export function buildFxApiHistoryUrl({
  baseCurrency,
  targetCurrency,
  fromDate,
  toDate,
}: {
  baseCurrency: string;
  targetCurrency: string;
  fromDate: string;
  toDate: string;
}) {
  const url = new URL(
    `https://fxapi.app/api/history/${normalizeCurrencyCode(baseCurrency).toLowerCase()}/${normalizeCurrencyCode(targetCurrency).toLowerCase()}.json`,
  );
  url.searchParams.set("from", fromDate);
  url.searchParams.set("to", toDate);

  return url.toString();
}

function buildCurrencyApiFallbackUrl({
  baseCurrency,
  date = "latest",
}: {
  baseCurrency: string;
  date?: string;
}): string {
  return `https://${date}.currency-api.pages.dev/v1/currencies/${normalizeCurrencyCode(baseCurrency).toLowerCase()}.json`;
}

export function createExchangeRateHistoryCacheKey({
  baseCurrency,
  targetCurrency,
  historyDays,
  anchorDate,
  refreshTimeZone,
}: {
  baseCurrency: string;
  targetCurrency: string;
  historyDays: number;
  anchorDate: string;
  refreshTimeZone?: string;
}) {
  const parts = [
    "exchange-rate-history",
    normalizeCurrencyCode(baseCurrency),
    normalizeCurrencyCode(targetCurrency),
    historyDays,
    refreshTimeZone ? normalizeTimeZoneSegment(refreshTimeZone) : null,
    anchorDate,
  ].filter((part): part is string | number => part !== null);

  return parts.join(":");
}

export function writeExchangeRateHistoryCache(
  storage: ExchangeRateCacheStorage,
  key: string,
  series: ExchangeRateHistorySeries,
) {
  storage.setItem(key, JSON.stringify(series));
}

export function readExchangeRateHistoryCache(
  storage: ExchangeRateCacheStorage,
  key: string,
  {
    now,
    nowMs,
    ttlMs = EXCHANGE_CACHE_TTL_MS,
    timeZone = EXCHANGE_REFRESH_FALLBACK_TIME_ZONE,
  }: {
    now?: Date;
    nowMs?: number;
    ttlMs?: number;
    timeZone?: string;
  } = {},
): ExchangeRateHistorySeries | null {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ExchangeRateHistorySeries;
    const cachedAtMs = Date.parse(parsed.cachedAt);
    const nowDate = now ?? new Date(nowMs ?? Date.now());
    if (
      !Number.isFinite(cachedAtMs) ||
      nowDate.getTime() - cachedAtMs > ttlMs ||
      getLocalDateKey(new Date(cachedAtMs), timeZone) !== getLocalDateKey(nowDate, timeZone)
    ) {
      storage.removeItem?.(key);
      return null;
    }
    if (!Array.isArray(parsed.points) || parsed.points.length === 0) return null;

    return parsed;
  } catch {
    storage.removeItem?.(key);
    return null;
  }
}

export async function fetchExchangeRatePoint({
  baseCurrency,
  targetCurrency,
  date = "latest",
  fetcher = fetch,
}: {
  baseCurrency: string;
  targetCurrency: string;
  date?: string;
  fetcher?: typeof fetch;
}): Promise<ExchangeRatePoint | null> {
  const base = normalizeCurrencyCode(baseCurrency);
  const target = normalizeCurrencyCode(targetCurrency);
  if (base === target) return { date: date === "latest" ? toIsoDate(new Date()) : date, rate: 1 };

  if (date === "latest") {
    const fxApiPoint = await fetchFxApiLatestExchangeRatePoint({
      baseCurrency: base,
      fetcher,
      targetCurrency: target,
    }).catch(() => null);

    if (fxApiPoint) return fxApiPoint;
  }

  const payload = await fetchCurrencyPayload({ baseCurrency: base, date, fetcher });
  const baseKey = base.toLowerCase();
  const targetKey = target.toLowerCase();
  const rates = payload[baseKey];
  const rate = rates?.[targetKey];

  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null;

  return {
    date: typeof payload.date === "string" ? payload.date : date,
    rate: roundRate(rate),
  };
}

async function fetchFxApiLatestExchangeRatePoint({
  baseCurrency,
  targetCurrency,
  fetcher,
}: {
  baseCurrency: string;
  targetCurrency: string;
  fetcher: typeof fetch;
}): Promise<ExchangeRatePoint | null> {
  const response = await fetcher(buildFxApiLatestUrl({ baseCurrency, targetCurrency }));
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    rate?: unknown;
    timestamp?: unknown;
  };
  if (typeof payload.rate !== "number" || !Number.isFinite(payload.rate) || payload.rate <= 0) {
    return null;
  }

  const timestamp = typeof payload.timestamp === "string" ? payload.timestamp : null;

  return {
    date: timestamp ? toIsoDate(new Date(timestamp)) : toIsoDate(new Date()),
    rate: roundRate(payload.rate),
  };
}

async function fetchFxApiHistoricalExchangeRateSeries({
  baseCurrency,
  targetCurrency,
  fromDate,
  toDate,
  fetcher,
  now,
}: {
  baseCurrency: string;
  targetCurrency: string;
  fromDate: string;
  toDate: string;
  fetcher: typeof fetch;
  now: Date;
}): Promise<ExchangeRateHistorySeries | null> {
  const response = await fetcher(
    buildFxApiHistoryUrl({ baseCurrency, fromDate, targetCurrency, toDate }),
  );
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    rates?: Array<{ date?: unknown; rate?: unknown }>;
  };
  const points = (payload.rates ?? [])
    .map((point): ExchangeRatePoint | null => {
      if (typeof point.date !== "string") return null;
      if (typeof point.rate !== "number" || !Number.isFinite(point.rate) || point.rate <= 0) {
        return null;
      }

      return {
        date: point.date,
        rate: roundRate(point.rate),
      };
    })
    .filter((point): point is ExchangeRatePoint => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) return null;

  return {
    baseCurrency,
    cachedAt: now.toISOString(),
    points,
    source: EXCHANGE_RATE_SOURCE,
    targetCurrency,
  };
}

export async function fetchHistoricalExchangeRateSeries({
  baseCurrency,
  targetCurrency,
  historyDays = EXCHANGE_HISTORY_DAYS,
  fetcher = fetch,
  now = new Date(),
  timeZone = EXCHANGE_REFRESH_FALLBACK_TIME_ZONE,
}: {
  baseCurrency: string;
  targetCurrency: string;
  historyDays?: number;
  fetcher?: typeof fetch;
  now?: Date;
  timeZone?: string;
}): Promise<ExchangeRateHistorySeries> {
  const base = normalizeCurrencyCode(baseCurrency);
  const target = normalizeCurrencyCode(targetCurrency);
  const anchorDate = getLocalDateKey(now, timeZone);
  const dates = Array.from({ length: historyDays }, (_, index) =>
    addUtcDays(anchorDate, index - historyDays + 1),
  );
  const fromDate = dates[0] ?? anchorDate;
  const fxApiSeries = await fetchFxApiHistoricalExchangeRateSeries({
    baseCurrency: base,
    fetcher,
    fromDate,
    now,
    targetCurrency: target,
    toDate: anchorDate,
  }).catch(() => null);

  if (fxApiSeries) return fxApiSeries;

  const points = (
    await Promise.all(
      dates.map((date) =>
        fetchExchangeRatePoint({ baseCurrency: base, targetCurrency: target, date, fetcher }).catch(
          () => null,
        ),
      ),
    )
  ).filter((point): point is ExchangeRatePoint => point !== null);

  if (points.length === 0) {
    throw new Error(`No exchange-rate history for ${base}/${target}`);
  }

  return {
    baseCurrency: base,
    cachedAt: now.toISOString(),
    points,
    source: EXCHANGE_RATE_FALLBACK_SOURCE,
    targetCurrency: target,
  };
}

export function forecastExchangeRates(
  history: ExchangeRatePoint[],
  {
    days = EXCHANGE_FORECAST_DAYS,
    windowSize = 14,
    startDate,
  }: {
    days?: number;
    windowSize?: number;
    startDate?: string;
  } = {},
): ExchangeRateForecastPoint[] {
  const sorted = [...history]
    .filter((point) => Number.isFinite(point.rate) && point.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  if (!latest) return [];

  const baseDate = startDate ?? latest.date;

  return Array.from({ length: days }, (_, index) => {
    const horizon = index + 1;
    const prediction = forecastRateWithBacktestedEnsemble(sorted, horizon, windowSize);

    return {
      date: addUtcDays(baseDate, horizon),
      expectedErrorRate: roundRate(prediction.expectedErrorRate),
      lowerRate: roundRate(
        Math.max(MIN_EXCHANGE_RATE, prediction.predictedRate - prediction.expectedErrorRate),
      ),
      predictedRate: roundRate(prediction.predictedRate),
      upperRate: roundRate(prediction.predictedRate + prediction.expectedErrorRate),
    };
  });
}

function forecastRateWithBacktestedEnsemble(
  history: ExchangeRatePoint[],
  horizon: number,
  windowSize: number,
) {
  const candidates = buildForecastCandidateRates(history, horizon, windowSize);
  const errors = calculateBacktestedForecastErrors(history, horizon, windowSize);
  const weights = calculateForecastWeights(errors);
  const predictedLogRate = FORECAST_CANDIDATE_NAMES.reduce(
    (sum, name) => sum + weights[name] * Math.log(Math.max(MIN_EXCHANGE_RATE, candidates[name])),
    0,
  );
  const predictedRate = Math.max(MIN_EXCHANGE_RATE, Math.exp(predictedLogRate));
  const expectedLogError = calculateWeightedLogError(errors, weights, history, horizon);
  const expectedErrorRate = predictedRate * (Math.exp(expectedLogError) - 1);

  return {
    expectedErrorRate,
    predictedRate,
  };
}

function buildForecastCandidateRates(
  history: ExchangeRatePoint[],
  horizon: number,
  windowSize: number,
): ForecastCandidateRates {
  const latest = history.at(-1);
  if (!latest) {
    return {
      ewmaLogReturn: MIN_EXCHANGE_RATE,
      meanReversion: MIN_EXCHANGE_RATE,
      randomWalk: MIN_EXCHANGE_RATE,
      shortMomentum: MIN_EXCHANGE_RATE,
    };
  }

  const latestRate = Math.max(MIN_EXCHANGE_RATE, latest.rate);
  const logReturns = calculateLogReturns(history);
  const recentReturns = logReturns.slice(-Math.max(1, windowSize - 1));
  const ewmaReturn = calculateEwmaAverage(recentReturns);
  const shortMomentumReturn = average(recentReturns.slice(-Math.min(5, recentReturns.length)));
  const meanLogRate = average(
    history.slice(-Math.max(2, Math.min(history.length, windowSize * 2))).map((point) =>
      Math.log(Math.max(MIN_EXCHANGE_RATE, point.rate)),
    ),
  );
  const latestLogRate = Math.log(latestRate);
  const meanReversionShare = 1 - Math.exp(-horizon / 5);

  return {
    ewmaLogReturn: latestRate * Math.exp(horizon * ewmaReturn),
    meanReversion: Math.exp(latestLogRate + (meanLogRate - latestLogRate) * meanReversionShare),
    randomWalk: latestRate,
    shortMomentum: latestRate * Math.exp(horizon * shortMomentumReturn),
  };
}

function calculateBacktestedForecastErrors(
  history: ExchangeRatePoint[],
  horizon: number,
  windowSize: number,
): ForecastModelErrors {
  const errors = Object.fromEntries(
    FORECAST_CANDIDATE_NAMES.map((name) => [name, [] as number[]]),
  ) as Record<ForecastCandidateName, number[]>;
  const minimumTrainingPoints = Math.max(4, Math.min(history.length - horizon, windowSize + 1));

  for (let endIndex = minimumTrainingPoints - 1; endIndex < history.length - horizon; endIndex += 1) {
    const trainingHistory = history.slice(0, endIndex + 1);
    const actualRate = history[endIndex + horizon]?.rate;
    if (!Number.isFinite(actualRate) || actualRate <= 0) continue;

    const candidateRates = buildForecastCandidateRates(trainingHistory, horizon, windowSize);
    const actualLogRate = Math.log(actualRate);

    FORECAST_CANDIDATE_NAMES.forEach((name) => {
      const predictedLogRate = Math.log(Math.max(MIN_EXCHANGE_RATE, candidateRates[name]));
      errors[name].push(Math.abs(predictedLogRate - actualLogRate));
    });
  }

  return Object.fromEntries(
    FORECAST_CANDIDATE_NAMES.map((name) => [name, average(errors[name])]),
  ) as ForecastModelErrors;
}

function calculateForecastWeights(errors: ForecastModelErrors): ForecastModelWeights {
  const scores = Object.fromEntries(
    FORECAST_CANDIDATE_NAMES.map((name) => {
      const error = errors[name];
      const safeError = Number.isFinite(error) && error > 0 ? error : 0.000001;

      return [name, 1 / safeError ** 2];
    }),
  ) as ForecastModelWeights;
  const totalScore = FORECAST_CANDIDATE_NAMES.reduce((sum, name) => sum + scores[name], 0);
  if (!Number.isFinite(totalScore) || totalScore <= 0) {
    return createEqualForecastWeights();
  }

  return Object.fromEntries(
    FORECAST_CANDIDATE_NAMES.map((name) => [name, scores[name] / totalScore]),
  ) as ForecastModelWeights;
}

function calculateWeightedLogError(
  errors: ForecastModelErrors,
  weights: ForecastModelWeights,
  history: ExchangeRatePoint[],
  horizon: number,
) {
  const weightedError = FORECAST_CANDIDATE_NAMES.reduce(
    (sum, name) => sum + weights[name] * errors[name],
    0,
  );
  if (Number.isFinite(weightedError) && weightedError > 0) return weightedError;

  return calculateLogReturnVolatility(history) * Math.sqrt(horizon);
}

function createEqualForecastWeights(): ForecastModelWeights {
  const weight = 1 / FORECAST_CANDIDATE_NAMES.length;

  return Object.fromEntries(
    FORECAST_CANDIDATE_NAMES.map((name) => [name, weight]),
  ) as ForecastModelWeights;
}

function calculateLogReturns(history: ExchangeRatePoint[]) {
  return history.slice(1).map((point, index) => {
    const previousRate = Math.max(MIN_EXCHANGE_RATE, history[index].rate);
    const currentRate = Math.max(MIN_EXCHANGE_RATE, point.rate);

    return Math.log(currentRate / previousRate);
  });
}

function calculateEwmaAverage(values: number[]) {
  if (values.length === 0) return 0;

  const weighted = values.reduce(
    (accumulator, value, index) => {
      const age = values.length - index - 1;
      const weight = EWMA_DECAY ** age;

      return {
        denominator: accumulator.denominator + weight,
        numerator: accumulator.numerator + value * weight,
      };
    },
    { denominator: 0, numerator: 0 },
  );

  return weighted.denominator > 0 ? weighted.numerator / weighted.denominator : 0;
}

function calculateLogReturnVolatility(history: ExchangeRatePoint[]) {
  const returns = calculateLogReturns(history);
  if (returns.length < 2) return 0;

  const mean = average(returns);
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length - 1);

  return Math.sqrt(Math.max(0, variance));
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

export function calculateExchangeTimingRecommendation({
  amount,
  baseCurrency,
  targetCurrency,
  currentRate,
  forecast,
}: {
  amount: number;
  baseCurrency: string;
  targetCurrency: string;
  currentRate: number;
  forecast: ExchangeRateForecastPoint[];
}): ExchangeTimingRecommendation {
  const today = {
    date: "today",
    predictedRate: currentRate,
  };
  const best = [today, ...forecast].reduce((currentBest, point) =>
    point.predictedRate > currentBest.predictedRate ? point : currentBest,
  );
  const todayTargetAmount = roundAmount(amount * currentRate);
  const bestTargetAmount = roundAmount(amount * best.predictedRate);
  const differenceTargetAmount = roundAmount(bestTargetAmount - todayTargetAmount);

  return {
    action: differenceTargetAmount > 0 ? "WAIT" : "TODAY",
    baseCurrency: normalizeCurrencyCode(baseCurrency),
    bestDate: best.date,
    bestPredictedRate: best.predictedRate,
    bestTargetAmount,
    currentRate,
    differenceTargetAmount,
    targetCurrency: normalizeCurrencyCode(targetCurrency),
    todayTargetAmount,
  };
}

export function buildExchangeSimulationRows({
  amount,
  currentDate,
  currentRate,
  forecast,
}: {
  amount: number;
  currentDate: string;
  currentRate: number;
  forecast: ExchangeRateForecastPoint[];
}): ExchangeSimulationRow[] {
  const sortedForecast = [...forecast].sort((a, b) => a.date.localeCompare(b.date));
  const todayTargetAmount = roundAmount(amount * currentRate);
  const offsets = [
    { label: "Today" as const, offset: 0, rate: currentRate, date: currentDate },
    { label: "1 day" as const, offset: 1 },
    { label: "3 days" as const, offset: 3 },
    { label: "7 days" as const, offset: 7 },
  ];
  const rows = offsets
    .map((item): Omit<ExchangeSimulationRow, "isBest"> | null => {
      if (item.offset === 0) {
        return {
          date: item.date,
          differenceFromToday: 0,
          judgment: "Current",
          label: item.label,
          rate: item.rate,
          targetAmount: todayTargetAmount,
        };
      }

      const targetDate = addUtcDays(currentDate, item.offset);
      const forecastPoint =
        sortedForecast.find((point) => point.date === targetDate) ?? sortedForecast[item.offset - 1];
      if (!forecastPoint) return null;

      const targetAmount = roundAmount(amount * forecastPoint.predictedRate);
      const differenceFromToday = roundAmount(targetAmount - todayTargetAmount);

      return {
        date: forecastPoint.date,
        differenceFromToday,
        judgment: judgeExchangeDifference(differenceFromToday),
        label: item.label,
        rate: forecastPoint.predictedRate,
        targetAmount,
      };
    })
    .filter((row): row is Omit<ExchangeSimulationRow, "isBest"> => row !== null);
  const bestAmount = Math.max(...rows.map((row) => row.targetAmount));

  return rows.map((row) => ({ ...row, isBest: row.targetAmount === bestAmount }));
}

export function calculateExchangeRateChangePercent({
  currentRate,
  previousRate,
}: {
  currentRate: number;
  previousRate: number;
}): number | null {
  if (
    !Number.isFinite(currentRate) ||
    !Number.isFinite(previousRate) ||
    currentRate <= 0 ||
    previousRate <= 0
  ) {
    return null;
  }

  return Number((((currentRate - previousRate) / previousRate) * 100).toFixed(2));
}

export function createExchangeRateForecastResult({
  amount,
  baseCurrency,
  targetCurrency,
  series,
  cacheHit,
  cacheKey,
  refreshDate,
  refreshTimeZone,
}: {
  amount: number;
  baseCurrency: string;
  targetCurrency: string;
  series: ExchangeRateHistorySeries;
  cacheHit: boolean;
  cacheKey: string;
  refreshDate: string;
  refreshTimeZone: string;
}): ExchangeRateForecastResult {
  const history = [...series.points].sort((a, b) => a.date.localeCompare(b.date));
  const currentRate = history.at(-1)?.rate;
  if (currentRate === undefined) {
    throw new Error("Exchange-rate history is empty");
  }
  const forecast = forecastExchangeRates(history, {
    days: EXCHANGE_FORECAST_DAYS,
    startDate: history.at(-1)?.date,
  });
  const recommendation = calculateExchangeTimingRecommendation({
    amount,
    baseCurrency,
    currentRate,
    forecast,
    targetCurrency,
  });

  return {
    amount,
    baseCurrency: normalizeCurrencyCode(baseCurrency),
    cache: {
      hit: cacheHit,
      key: cacheKey,
      ttlHours: EXCHANGE_CACHE_TTL_MS / (60 * 60 * 1000),
      refreshDate,
      refreshTimeZone,
    },
    fetchedAt: series.cachedAt,
    forecast,
    history,
    recommendation,
    source: series.source,
    targetCurrency: normalizeCurrencyCode(targetCurrency),
  };
}

function judgeExchangeDifference(
  differenceFromToday: number,
): ExchangeSimulationRow["judgment"] {
  if (differenceFromToday === 0) return "No change";
  if (differenceFromToday > 0 && differenceFromToday <= 1) return "Slight gain";
  if (differenceFromToday > 0) return "Gain";
  if (differenceFromToday >= -1) return "Slight loss";

  return "Loss";
}

export const fetchExchangeRateForecast = createServerFn({ method: "GET" })
  .inputValidator(exchangeForecastInputSchema)
  .handler(async ({ data }): Promise<ExchangeRateForecastResult> => {
    const amount = data.amount;
    const baseCurrency = normalizeCurrencyCode(data.baseCurrency);
    const targetCurrency = normalizeCurrencyCode(data.targetCurrency);
    const historyDays = data.historyDays ?? EXCHANGE_HISTORY_DAYS;
    const refreshTimeZone = data.refreshTimeZone ?? EXCHANGE_REFRESH_FALLBACK_TIME_ZONE;
    const now = new Date();
    const refreshDate = getLocalDateKey(now, refreshTimeZone);
    const cacheKey = createExchangeRateHistoryCacheKey({
      anchorDate: refreshDate,
      baseCurrency,
      historyDays,
      refreshTimeZone,
      targetCurrency,
    });
    const cached = readExchangeRateHistoryCache(serverCacheStorage, cacheKey, {
      now,
      timeZone: refreshTimeZone,
    });
    const series =
      cached ??
      (await fetchHistoricalExchangeRateSeries({
        baseCurrency,
        historyDays,
        now,
        targetCurrency,
        timeZone: refreshTimeZone,
      }));

    if (!cached) writeExchangeRateHistoryCache(serverCacheStorage, cacheKey, series);

    return createExchangeRateForecastResult({
      amount,
      baseCurrency,
      cacheHit: cached !== null,
      cacheKey,
      refreshDate,
      refreshTimeZone,
      series,
      targetCurrency,
    });
  });

export async function fetchExchangeRate(
  targetCurrencyCode: string,
  baseCurrencyCode: string = "KRW",
  { fetcher = fetch }: { fetcher?: typeof fetch } = {},
): Promise<ExchangeRateInfo | null> {
  try {
    const from = normalizeCurrencyCode(targetCurrencyCode);
    const to = normalizeCurrencyCode(baseCurrencyCode);

    if (from === to) return null;

    const point = await fetchExchangeRatePoint({
      baseCurrency: from,
      fetcher,
      targetCurrency: to,
    });

    if (!point) return null;

    const previousPoint = isIsoDateKey(point.date)
      ? await fetchExchangeRatePoint({
          baseCurrency: from,
          date: addUtcDays(point.date, -1),
          fetcher,
          targetCurrency: to,
        }).catch(() => null)
      : null;

    return {
      baseCurrency: to,
      changePercent: previousPoint
        ? calculateExchangeRateChangePercent({
            currentRate: point.rate,
            previousRate: previousPoint.rate,
          })
        : null,
      fetchedAt: new Date().toISOString(),
      rate: point.rate,
      targetCurrency: from,
    };
  } catch (error) {
    console.error("[ExchangeRate] Error fetching exchange rate:", error);
    return null;
  }
}

export function getCurrencyCodeForCountry(countryIso2: string): string | null {
  return COUNTRY_TO_CURRENCY[countryIso2.toUpperCase()] || null;
}

export function isSupportedExchangeCurrency(
  currency: string,
): currency is ExchangeCurrencyCode {
  return exchangeCurrencyOptions.includes(normalizeCurrencyCode(currency) as ExchangeCurrencyCode);
}

async function fetchCurrencyPayload({
  baseCurrency,
  date,
  fetcher,
}: {
  baseCurrency: string;
  date: string;
  fetcher: typeof fetch;
}): Promise<Record<string, Record<string, number>> & { date?: string }> {
  const primaryUrl = buildCurrencyApiUrl({ baseCurrency, date });
  const response = await fetcher(primaryUrl);
  if (response.ok) return response.json();

  const fallbackUrl = buildCurrencyApiFallbackUrl({ baseCurrency, date });
  const fallbackResponse = await fetcher(fallbackUrl);
  if (!fallbackResponse.ok) {
    throw new Error(`Currency API failed: ${response.status}/${fallbackResponse.status}`);
  }

  return fallbackResponse.json();
}
