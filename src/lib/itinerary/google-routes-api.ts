import type { Fetcher } from "./google-places-api";
import type { TravelMode } from "./recommendation-policy";

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
  BICYCLE: "Bicycle",
  DRIVE: "Drive",
  TRANSIT: "Transit",
  WALK: "Walk",
};

/** ?대룞?섎떒???쒓뎅???쇰꺼??諛섑솚?쒕떎. */
export const getTravelModeLabel = (mode: TravelMode = "WALK") =>
  TRAVEL_MODE_LABELS[mode] ?? TRAVEL_MODE_LABELS.WALK;

/** ??醫뚰몴 媛?吏곸꽑嫄곕━(誘명꽣) ???쒗솚李몄“ 諛⑹?瑜??꾪븳 濡쒖뺄 援ы쁽 */
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

/** TRANSIT ?됯퇏 ?띾룄(?쒕궡 ?以묎탳??: 25 km/h */
const TRANSIT_ESTIMATED_SPEED_KMH = 25;
/** ?꾨줈 蹂댁젙 怨꾩닔 (吏곸꽑 ???ㅼ젣 寃쎈줈) */
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
 * ??吏??媛?寃쎈줈瑜?Google Routes API濡?怨꾩궛?쒕떎.
 * @deprecated computeWalkingRoute???섏쐞 ?명솚??alias?낅땲?? computeRoute瑜??ъ슜?섏꽭??
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
  const response = await fetcher(ROUTES_COMPUTE_URL, {
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
  });

  if (!response.ok) {
    if (travelMode === "TRANSIT") {
      return estimateTransitFallback(origin, destination);
    }
    return { distanceMeters: 0, durationMinutes: 0 };
  }

  const payload = (await response.json()) as {
    routes?: Array<{ distanceMeters?: number; duration?: string }>;
  };
  const route = payload.routes?.[0];

  const durationMinutes = parseGoogleDurationToMinutes(route?.duration);
  const distanceMeters = route?.distanceMeters ?? 0;

  if (travelMode === "TRANSIT" && (durationMinutes === 0 || !route)) {
    return estimateTransitFallback(origin, destination);
  }

  return { distanceMeters, durationMinutes };
};
