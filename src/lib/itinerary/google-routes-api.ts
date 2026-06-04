import type { Fetcher } from "./google-places-api";
import type { TravelMode } from "./recommendation-policy";
import { routeCache, createRoutesCacheKey } from "./api-cache";

export interface RouteSummary {
  distanceMeters: number;
  durationMinutes: number;
}

const ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const ROUTES_FIELD_MASK = "routes.duration,routes.distanceMeters";

const parseGoogleDurationToMinutes = (duration?: string) => {
  const match = duration?.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return 0;
  return Math.max(1, Math.round(Number(match[1]) / 60));
};

const createRouteWaypoint = (point: { lat: number; lng: number }) => ({
  location: {
    latLng: {
      latitude: point.lat,
      longitude: point.lng,
    },
  },
});

const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  BICYCLE: "자전거",
  DRIVE: "자동차",
  TRANSIT: "대중교통",
  WALK: "도보",
};

/** 이동수단의 한국어 라벨을 반환합니다. */
export const getTravelModeLabel = (mode: TravelMode = "WALK") =>
  TRAVEL_MODE_LABELS[mode] ?? TRAVEL_MODE_LABELS.WALK;

/** 두 좌표 간 직선거리(미터) - 순환참조 방지를 위한 로컬 구현 */
const haversineMetersLocal = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/** TRANSIT 평균 속도(시내 대중교통): 25 km/h */
const TRANSIT_ESTIMATED_SPEED_KMH = 25;
/** 도로 보정 계수 (직선 vs 실제 경로) */
const ROAD_FACTOR = 1.4;

const estimateTransitFallback = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): RouteSummary => {
  const straightLine = haversineMetersLocal(origin, destination);
  const distanceMeters = Math.round(straightLine * ROAD_FACTOR);
  const durationMinutes = Math.max(
    1,
    Math.round((distanceMeters / 1000 / TRANSIT_ESTIMATED_SPEED_KMH) * 60),
  );
  return { distanceMeters, durationMinutes };
};

/**
 * 두 지점 간 경로를 Google Routes API로 계산합니다.
 * @deprecated computeWalkingRoute는 하위 호환성 alias입니다. computeRoute를 사용하세요.
 */
export const computeWalkingRoute = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options: { fetcher?: Fetcher; googleApiKey: string },
): Promise<RouteSummary> => computeRoute(origin, destination, { ...options, travelMode: "WALK" });

export const computeRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  {
    fetcher = fetch,
    googleApiKey,
    travelMode = "WALK",
  }: {
    fetcher?: Fetcher;
    googleApiKey: string;
    travelMode?: TravelMode;
  },
): Promise<RouteSummary> => {
  const cacheKey = createRoutesCacheKey(origin, destination, travelMode);
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let response: Response;
  try {
    response = await fetcher(ROUTES_COMPUTE_URL, {
      body: JSON.stringify({
        destination: createRouteWaypoint(destination),
        origin: createRouteWaypoint(origin),
        travelMode,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
      },
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    let result: RouteSummary;
    if (travelMode === "TRANSIT") {
      result = estimateTransitFallback(origin, destination);
    } else {
      const haversineDistance = haversineMetersLocal(origin, destination);
      result = {
        distanceMeters: Math.round(haversineDistance),
        durationMinutes: Math.round((haversineDistance / 1000) * 15),
      };
    }
    routeCache.set(cacheKey, result);
    return result;
  }

  if (!response.ok) {
    let result: RouteSummary;
    if (travelMode === "TRANSIT") {
      result = estimateTransitFallback(origin, destination);
    } else {
      const haversineDistance = haversineMetersLocal(origin, destination);
      result = {
        distanceMeters: Math.round(haversineDistance),
        durationMinutes: Math.round((haversineDistance / 1000) * 15),
      };
    }
    routeCache.set(cacheKey, result);
    return result;
  }

  const payload = (await response.json()) as {
    routes?: Array<{ distanceMeters?: number; duration?: string }>;
  };
  const route = payload.routes?.[0];

  const durationMinutes = parseGoogleDurationToMinutes(route?.duration);
  const distanceMeters = route?.distanceMeters ?? 0;

  let result: RouteSummary;
  if (travelMode === "TRANSIT" && (durationMinutes === 0 || !route)) {
    result = estimateTransitFallback(origin, destination);
  } else {
    result = { distanceMeters, durationMinutes };
  }

  routeCache.set(cacheKey, result);
  return result;
};
