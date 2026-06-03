import type {
  Destination,
  DestinationWeatherForecast,
  RiskLevel,
  WeatherForecastDay,
  WeatherForecastStatus,
} from "./types";

export const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
export const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "uv_index_max",
] as const;

const OPEN_METEO_CITY_ALIASES: Record<string, Record<string, string>> = {
  AU: {
    골드코스트: "Gold Coast",
    멜버른: "Melbourne",
    브리즈번: "Brisbane",
    시드니: "Sydney",
    퍼스: "Perth",
  },
  CA: {
    몬트리올: "Montreal",
    밴쿠버: "Vancouver",
    오타와: "Ottawa",
    캘거리: "Calgary",
    토론토: "Toronto",
  },
  DE: {
    뮌헨: "Munich",
    베를린: "Berlin",
    프랑크푸르트: "Frankfurt",
    함부르크: "Hamburg",
  },
  GB: {
    런던: "London",
    리버풀: "Liverpool",
    맨체스터: "Manchester",
    버밍엄: "Birmingham",
    에든버러: "Edinburgh",
  },
  JP: {
    교토: "Kyoto",
    나고야: "Nagoya",
    도쿄: "Tokyo",
    삿포로: "Sapporo",
    오사카: "Osaka",
    오키나와: "Okinawa",
    후쿠오카: "Fukuoka",
  },
  US: {
    뉴욕: "New York",
    로스앤젤레스: "Los Angeles",
    보스턴: "Boston",
    샌프란시스코: "San Francisco",
    시애틀: "Seattle",
    워싱턴: "Washington, D.C.",
    "워싱턴 D.C.": "Washington, D.C.",
    시카고: "Chicago",
    호놀룰루: "Honolulu",
    "호놀룰루 (하와이)": "Honolulu",
  },
};

type GeocodingResponse = {
  results?: Array<{
    name?: string;
    latitude?: number;
    longitude?: number;
    country_code?: string;
    timezone?: string;
    country?: string;
  }>;
  error?: boolean;
  reason?: string;
};

type ForecastResponse = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    uv_index_max?: number[];
  };
  error?: boolean;
  reason?: string;
};

export type FetchDestinationWeatherOptions = {
  destination: Destination;
  fetcher?: typeof fetch;
  now?: () => string;
};

export function buildGeocodingUrl(destination: Destination): string {
  const url = new URL(OPEN_METEO_GEOCODING_URL);
  url.searchParams.set("name", destinationSearchName(destination));
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "ko");
  url.searchParams.set("format", "json");
  if (destination.countryIsoAlp2) {
    url.searchParams.set("countryCode", destination.countryIsoAlp2);
  }
  return url.toString();
}

export function buildForecastUrl(latitude: number, longitude: number): string {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", DAILY_VARIABLES.join(","));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "16");
  return url.toString();
}

export async function fetchDestinationWeather({
  destination,
  fetcher = fetch,
  now = () => new Date().toISOString(),
}: FetchDestinationWeatherOptions): Promise<DestinationWeatherForecast> {
  const fetchedAt = now();

  try {
    const geocoded = await geocodeDestination(destination, fetcher);
    if (!geocoded || geocoded.latitude === undefined || geocoded.longitude === undefined) {
      return emptyForecast(destination, "geocode_empty", fetchedAt, [
        "도시 좌표를 확인하지 못해 날씨 예보를 제공할 수 없습니다.",
      ]);
    }

    const response = await fetcher(buildForecastUrl(geocoded.latitude, geocoded.longitude));
    if (!response.ok) {
      throw new Error(`Open-Meteo forecast failed: ${response.status}`);
    }
    const payload = (await response.json()) as ForecastResponse;
    if (payload.error) throw new Error(payload.reason || "Open-Meteo forecast error");

    const allDays = normalizeForecastDays(payload);
    const requestedDays = filterTripDateRange(allDays, destination);
    const status = resolveForecastStatus(allDays, requestedDays, destination);
    const riskLevel = classifyWeatherRisk(requestedDays);

    return {
      destinationId: destination.id,
      countryIsoAlp2: destination.countryIsoAlp2,
      countryNm: destination.countryNm,
      city: primaryCity(destination),
      status,
      source: "open_meteo",
      fetchedAt,
      latitude: payload.latitude ?? geocoded.latitude,
      longitude: payload.longitude ?? geocoded.longitude,
      timezone: payload.timezone ?? geocoded.timezone,
      riskLevel,
      summary: summarizeWeather(status, requestedDays, riskLevel),
      days: requestedDays,
      notices: buildWeatherNotices(status, destination, allDays),
    };
  } catch {
    return emptyForecast(destination, "failed", fetchedAt, [
      "Open-Meteo 예보 조회에 실패했습니다.",
    ]);
  }
}

async function geocodeDestination(destination: Destination, fetcher: typeof fetch) {
  const response = await fetcher(buildGeocodingUrl(destination));
  if (!response.ok) throw new Error(`Open-Meteo geocoding failed: ${response.status}`);
  const payload = (await response.json()) as GeocodingResponse;
  if (payload.error) throw new Error(payload.reason || "Open-Meteo geocoding error");

  return payload.results?.find(
    (item) => typeof item.latitude === "number" && typeof item.longitude === "number",
  );
}

function normalizeForecastDays(payload: ForecastResponse): WeatherForecastDay[] {
  const daily = payload.daily;
  const dates = daily?.time ?? [];
  return dates.map((date, index) => {
    const code = valueAt(daily?.weather_code, index);
    return {
      date,
      weatherCode: code,
      weatherLabel: weatherCodeLabel(code),
      tempMinC: valueAt(daily?.temperature_2m_min, index),
      tempMaxC: valueAt(daily?.temperature_2m_max, index),
      precipitationMm: valueAt(daily?.precipitation_sum, index),
      precipitationProbabilityMax: valueAt(daily?.precipitation_probability_max, index),
      windSpeedKmhMax: valueAt(daily?.wind_speed_10m_max, index),
      uvIndexMax: valueAt(daily?.uv_index_max, index),
    };
  });
}

function filterTripDateRange(days: WeatherForecastDay[], destination: Destination) {
  if (!destination.arrivalDate) return days.slice(0, 5);
  const start = destination.arrivalDate;
  const end = destination.departureDate || destination.arrivalDate;
  return days.filter((day) => day.date >= start && day.date <= end);
}

function resolveForecastStatus(
  allDays: WeatherForecastDay[],
  requestedDays: WeatherForecastDay[],
  destination: Destination,
): WeatherForecastStatus {
  if (allDays.length === 0) return "failed";
  if (!destination.arrivalDate) return requestedDays.length > 0 ? "success" : "failed";
  if (requestedDays.length === 0) return "out_of_range";
  const expected = expectedTripDayCount(destination.arrivalDate, destination.departureDate);
  return requestedDays.length >= expected ? "success" : "partial";
}

function expectedTripDayCount(arrivalDate: string, departureDate?: string) {
  const start = Date.parse(`${arrivalDate}T00:00:00Z`);
  const end = Date.parse(`${departureDate || arrivalDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.floor((end - start) / 86400000) + 1;
}

function classifyWeatherRisk(days: WeatherForecastDay[]): RiskLevel {
  if (days.length === 0) return "UNKNOWN";
  const maxRainProbability = Math.max(...days.map((day) => day.precipitationProbabilityMax ?? 0));
  const maxRainMm = Math.max(...days.map((day) => day.precipitationMm ?? 0));
  const maxWind = Math.max(...days.map((day) => day.windSpeedKmhMax ?? 0));
  const maxUv = Math.max(...days.map((day) => day.uvIndexMax ?? 0));
  const rainyDays = days.filter(
    (day) => (day.precipitationProbabilityMax ?? 0) >= 60 || (day.precipitationMm ?? 0) >= 10,
  ).length;

  if (maxRainMm >= 50 || maxWind >= 62) return "HIGH";
  if (maxRainProbability >= 80 || maxRainMm >= 25 || maxWind >= 45 || maxUv >= 8) {
    return "CAUTION";
  }
  if (rainyDays >= 2 || maxRainProbability >= 60 || maxRainMm >= 10 || maxUv >= 6) {
    return "WATCH";
  }
  return "LOW";
}

function summarizeWeather(
  status: WeatherForecastStatus,
  days: WeatherForecastDay[],
  riskLevel: RiskLevel,
): string {
  if (status === "geocode_empty") return "도시 좌표를 확인할 수 없어 예보를 표시하지 못했습니다.";
  if (status === "failed") return "날씨 예보 조회에 실패했습니다.";
  if (status === "out_of_range") return "여행일이 현재 예보 가능 범위를 벗어났습니다.";
  if (days.length === 0) return "표시할 예보가 없습니다.";

  const maxPop = Math.max(...days.map((day) => day.precipitationProbabilityMax ?? 0));
  const maxTemp = Math.max(...days.map((day) => day.tempMaxC ?? Number.NEGATIVE_INFINITY));
  const maxUv = Math.max(...days.map((day) => day.uvIndexMax ?? 0));

  if (riskLevel === "HIGH") return "강한 비나 바람 가능성이 있어 실외 일정 조정이 필요합니다.";
  if (riskLevel === "CAUTION") return `비 가능성 최대 ${maxPop}%·자외선 최대 ${maxUv.toFixed(0)} 수준입니다.`;
  if (riskLevel === "WATCH") return `소나기 또는 강한 햇볕 가능성이 있습니다. 최고 ${maxTemp.toFixed(0)}°C 기준으로 준비하세요.`;
  return `예보 범위 내 큰 기상 리스크는 낮습니다. 최고 ${maxTemp.toFixed(0)}°C 수준입니다.`;
}

function buildWeatherNotices(
  status: WeatherForecastStatus,
  destination: Destination,
  allDays: WeatherForecastDay[],
): string[] | undefined {
  if (status !== "partial" && status !== "out_of_range") return undefined;
  const lastDate = allDays.at(-1)?.date;
  if (status === "out_of_range") {
    return [
      lastDate
        ? `현재 Open-Meteo 예보는 ${lastDate}까지 확인됐습니다. ${destination.arrivalDate} 이후 일정은 출국 직전에 다시 확인해야 합니다.`
        : "현재 예보 가능 범위를 확인하지 못했습니다.",
    ];
  }
  return [
    lastDate
      ? `일부 여행일만 예보 범위에 포함됩니다. 현재 확인 가능 마지막 날짜는 ${lastDate}입니다.`
      : "일부 여행일만 예보 범위에 포함됩니다.",
  ];
}

function emptyForecast(
  destination: Destination,
  status: WeatherForecastStatus,
  fetchedAt: string,
  notices?: string[],
): DestinationWeatherForecast {
  return {
    destinationId: destination.id,
    countryIsoAlp2: destination.countryIsoAlp2,
    countryNm: destination.countryNm,
    city: primaryCity(destination),
    status,
    source: "open_meteo",
    fetchedAt,
    riskLevel: "UNKNOWN",
    summary: summarizeWeather(status, [], "UNKNOWN"),
    days: [],
    notices,
  };
}

function destinationSearchName(destination: Destination): string {
  const city = primaryCity(destination);
  const alias = OPEN_METEO_CITY_ALIASES[destination.countryIsoAlp2]?.[city];

  return alias || city || destination.countryNm;
}

function primaryCity(destination: Destination): string {
  return destination.cities.find((city: string) => city.trim().length > 0)?.trim() ?? "";
}

function valueAt(values: number[] | undefined, index: number): number | undefined {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function weatherCodeLabel(code?: number): string {
  if (code === undefined) return "정보 없음";
  if (code === 0) return "맑음";
  if ([1, 2, 3].includes(code)) return "대체로 맑음";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57].includes(code)) return "이슬비";
  if ([61, 63, 65, 66, 67].includes(code)) return "비";
  if ([71, 73, 75, 77].includes(code)) return "눈";
  if ([80, 81, 82].includes(code)) return "소나기";
  if ([95, 96, 99].includes(code)) return "뇌우";
  return "변동성 있음";
}
