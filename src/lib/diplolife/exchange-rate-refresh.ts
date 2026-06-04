export const EXCHANGE_REFRESH_FALLBACK_TIME_ZONE = "UTC";

const COUNTRY_TIME_ZONES: Record<string, string> = {
  AU: "Australia/Sydney",
  CA: "America/Toronto",
  CN: "Asia/Shanghai",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  EU: "Europe/Brussels",
  FR: "Europe/Paris",
  GB: "Europe/London",
  HK: "Asia/Hong_Kong",
  IT: "Europe/Rome",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  NZ: "Pacific/Auckland",
  PH: "Asia/Manila",
  SG: "Asia/Singapore",
  TH: "Asia/Bangkok",
  TW: "Asia/Taipei",
  US: "America/New_York",
  VN: "Asia/Ho_Chi_Minh",
};

const CITY_TIME_ZONES: Record<string, string> = {
  "AU:adelaide": "Australia/Adelaide",
  "AU:brisbane": "Australia/Brisbane",
  "AU:melbourne": "Australia/Melbourne",
  "AU:perth": "Australia/Perth",
  "AU:sydney": "Australia/Sydney",
  "CA:calgary": "America/Edmonton",
  "CA:montreal": "America/Toronto",
  "CA:toronto": "America/Toronto",
  "CA:vancouver": "America/Vancouver",
  "US:anchorage": "America/Anchorage",
  "US:boston": "America/New_York",
  "US:chicago": "America/Chicago",
  "US:denver": "America/Denver",
  "US:honolulu": "Pacific/Honolulu",
  "US:las vegas": "America/Los_Angeles",
  "US:los angeles": "America/Los_Angeles",
  "US:miami": "America/New_York",
  "US:new york": "America/New_York",
  "US:san francisco": "America/Los_Angeles",
  "US:seattle": "America/Los_Angeles",
  "US:washington": "America/New_York",
  "US:washington, d.c.": "America/New_York",
  "JP:tokyo": "Asia/Tokyo",
  "JP:osaka": "Asia/Tokyo",
  "JP:kyoto": "Asia/Tokyo",
  "JP:fukuoka": "Asia/Tokyo",
};

const normalizeCountry = (countryIso2?: string | null) => countryIso2?.trim().toUpperCase() ?? "";

const normalizeCity = (city?: string | null) =>
  city?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const toSafeTimeZone = (timeZone?: string | null) => {
  const candidate = timeZone?.trim() || EXCHANGE_REFRESH_FALLBACK_TIME_ZONE;

  return isValidTimeZone(candidate) ? candidate : EXCHANGE_REFRESH_FALLBACK_TIME_ZONE;
};

export const normalizeTimeZoneSegment = (timeZone: string) =>
  toSafeTimeZone(timeZone).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") ||
  EXCHANGE_REFRESH_FALLBACK_TIME_ZONE;

export function resolveExchangeRefreshTimeZone({
  city,
  countryIso2,
}: {
  city?: string | null;
  countryIso2?: string | null;
}) {
  const country = normalizeCountry(countryIso2);
  const cityKey = `${country}:${normalizeCity(city)}`;

  return CITY_TIME_ZONES[cityKey] ?? COUNTRY_TIME_ZONES[country] ?? EXCHANGE_REFRESH_FALLBACK_TIME_ZONE;
}

export function getLocalDateKey(date: Date | string, timeZone: string) {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  if (!Number.isFinite(parsedDate.getTime())) return "invalid-date";

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: toSafeTimeZone(timeZone),
    year: "numeric",
  }).formatToParts(parsedDate);
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function getMsUntilNextLocalDate({
  now = new Date(),
  timeZone,
}: {
  now?: Date;
  timeZone: string;
}) {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return 60 * 60 * 1000;

  const currentDate = getLocalDateKey(now, timeZone);
  let low = nowMs;
  let high = nowMs + 48 * 60 * 60 * 1000;

  while (getLocalDateKey(new Date(high), timeZone) === currentDate) {
    high += 24 * 60 * 60 * 1000;
  }

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (getLocalDateKey(new Date(mid), timeZone) === currentDate) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.max(0, high - nowMs);
}
