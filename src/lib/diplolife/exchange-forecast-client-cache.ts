import {
  EXCHANGE_CACHE_TTL_MS,
  EXCHANGE_HISTORY_DAYS,
  type ExchangeRateForecastResult,
} from "./api/exchange-rate";
import {
  EXCHANGE_REFRESH_FALLBACK_TIME_ZONE,
  getLocalDateKey,
  normalizeTimeZoneSegment,
} from "./exchange-rate-refresh";

export interface ExchangeForecastClientCacheStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

export interface ExchangeForecastClientCacheEntry {
  cachedAt: string;
  data: ExchangeRateForecastResult;
}

const memoryStorage = (() => {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  };
})();

const normalizeCurrencyCode = (currency: string) => currency.trim().toUpperCase();

export const createExchangeForecastClientCacheKey = ({
  baseCurrency,
  historyDays = EXCHANGE_HISTORY_DAYS,
  refreshDate,
  refreshTimeZone,
  targetCurrency,
}: {
  baseCurrency: string;
  historyDays?: number;
  refreshDate: string;
  refreshTimeZone: string;
  targetCurrency: string;
}) =>
  [
    "exchange-rate-forecast-client",
    normalizeCurrencyCode(baseCurrency),
    normalizeCurrencyCode(targetCurrency),
    historyDays,
    normalizeTimeZoneSegment(refreshTimeZone),
    refreshDate,
  ].join(":");

export const getExchangeForecastClientCacheStorage =
  (): ExchangeForecastClientCacheStorage => {
    if (typeof window === "undefined") return memoryStorage;

    try {
      return window.localStorage;
    } catch {
      return memoryStorage;
    }
  };

export const writeExchangeForecastClientCache = (
  storage: ExchangeForecastClientCacheStorage,
  key: string,
  data: ExchangeRateForecastResult,
  { cachedAt = new Date().toISOString() }: { cachedAt?: string } = {},
) => {
  storage.setItem(key, JSON.stringify({ cachedAt, data }));
};

export const readExchangeForecastClientCache = (
  storage: ExchangeForecastClientCacheStorage,
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
): ExchangeForecastClientCacheEntry | null => {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ExchangeForecastClientCacheEntry;
    const cachedAtMs = Date.parse(parsed.cachedAt);
    const nowDate = now ?? new Date(nowMs ?? Date.now());
    const currentLocalDate = getLocalDateKey(nowDate, timeZone);
    const cachedLocalDate =
      parsed.data?.cache?.refreshDate ?? getLocalDateKey(new Date(cachedAtMs), timeZone);

    if (
      !Number.isFinite(cachedAtMs) ||
      nowDate.getTime() - cachedAtMs > ttlMs ||
      cachedLocalDate !== currentLocalDate ||
      getLocalDateKey(new Date(cachedAtMs), timeZone) !== currentLocalDate
    ) {
      storage.removeItem?.(key);
      return null;
    }

    if (!Array.isArray(parsed.data?.history) || !Array.isArray(parsed.data?.forecast)) {
      storage.removeItem?.(key);
      return null;
    }

    return parsed;
  } catch {
    storage.removeItem?.(key);
    return null;
  }
};

export const readHydratedExchangeForecastClientCache = (
  storage: ExchangeForecastClientCacheStorage,
  key: string,
  options: {
    isHydrated: boolean;
    now?: Date;
    nowMs?: number;
    ttlMs?: number;
    timeZone?: string;
  },
): ExchangeForecastClientCacheEntry | null => {
  if (!options.isHydrated) return null;

  return readExchangeForecastClientCache(storage, key, {
    now: options.now,
    nowMs: options.nowMs,
    ttlMs: options.ttlMs,
    timeZone: options.timeZone,
  });
};
