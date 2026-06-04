import type { ItineraryPlace } from "@/lib/gemini/schema";

import type { GoogleFirstItineraryOptions } from "./google-place-candidates";
import { computeRoute, getTravelModeLabel, type RouteSummary } from "./google-routes-api";
import { haversineMeters } from "./google-itinerary-scoring";
import { selectBestRouteOption } from "./google-first-place-builder";
import type { TravelMode } from "./recommendation-policy";

type LatLng = {
  lat: number;
  lng: number;
};

interface OptimizeItineraryPlaceOrderInput {
  departure: LatLng;
  options: GoogleFirstItineraryOptions;
  places: ItineraryPlace[];
  startTime: string;
  travelModes: TravelMode[];
}

type RouteEvaluation = {
  distanceRank: number;
  mode: TravelMode;
  route: RouteSummary;
};

export type RouteOrderedItem<T> = {
  item: T;
  leg: RouteEvaluation;
  origin: LatLng;
  originalIndex: number;
};

interface OptimizeItemsByRouteInput<T> {
  departure: LatLng;
  getLocation: (item: T) => LatLng;
  items: T[];
  options: GoogleFirstItineraryOptions;
  travelModes: TravelMode[];
}

type PendingPlace = {
  originalIndex: number;
  place: ItineraryPlace;
};

type OrderedPlace = PendingPlace & {
  leg: RouteEvaluation;
  origin: LatLng;
};

const isFiniteCoordinate = (place: ItineraryPlace): boolean =>
  Number.isFinite(place.lat) && Number.isFinite(place.lng);

const uniqueTravelModes = (allowedModes: TravelMode[]) =>
  [...new Set(allowedModes.length > 0 ? allowedModes : ["WALK"])] as TravelMode[];

const parseTimeToMinutes = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

const formatDistanceMeters = (distanceMeters: number) =>
  distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

const sanitizeStayMinutes = (minutes: number) =>
  Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;

const stripReturnRouteContext = (context: ItineraryPlace["recommendationContext"]) => {
  if (!context) return undefined;

  const {
    returnRouteDistanceMeters: _returnRouteDistanceMeters,
    returnRouteDurationMinutes: _returnRouteDurationMinutes,
    returnRouteTravelMode: _returnRouteTravelMode,
    ...rest
  } = context as Record<string, unknown>;

  return rest;
};

const evaluateRouteLeg = async (
  origin: LatLng,
  destination: LatLng,
  options: GoogleFirstItineraryOptions,
  travelModes: TravelMode[],
): Promise<RouteEvaluation> => {
  const routeOptions = await Promise.all(
    uniqueTravelModes(travelModes).map(async (mode) => ({
      mode,
      route: await computeRoute(origin, destination, { ...options, travelMode: mode }),
    })),
  );
  const bestRoute = selectBestRouteOption(routeOptions);
  const fallbackDistance = Math.round(haversineMeters(origin, destination));
  const routeDistance = bestRoute.route.distanceMeters || fallbackDistance;

  return {
    distanceRank: routeDistance,
    mode: bestRoute.mode,
    route: {
      distanceMeters: routeDistance,
      durationMinutes: bestRoute.route.durationMinutes,
    },
  };
};

const selectNextItem = async <T>(
  current: LatLng,
  pending: Array<{ item: T; originalIndex: number }>,
  getLocation: (item: T) => LatLng,
  options: GoogleFirstItineraryOptions,
  travelModes: TravelMode[],
) => {
  const evaluated = await Promise.all(
    pending.map(async (item) => ({
      ...item,
      leg: await evaluateRouteLeg(
        current,
        getLocation(item.item),
        options,
        travelModes,
      ),
      origin: current,
    })),
  );

  return [...evaluated].sort((left, right) => {
    const leftDuration = left.leg.route.durationMinutes || Number.POSITIVE_INFINITY;
    const rightDuration = right.leg.route.durationMinutes || Number.POSITIVE_INFINITY;
    if (leftDuration !== rightDuration) return leftDuration - rightDuration;
    if (left.leg.distanceRank !== right.leg.distanceRank) {
      return left.leg.distanceRank - right.leg.distanceRank;
    }
    return left.originalIndex - right.originalIndex;
  })[0];
};

export const optimizeItemsByRoute = async <T>({
  departure,
  getLocation,
  items,
  options,
  travelModes,
}: OptimizeItemsByRouteInput<T>): Promise<Array<RouteOrderedItem<T>>> => {
  const pending = items.map((item, originalIndex) => ({ item, originalIndex }));
  const ordered: Array<RouteOrderedItem<T>> = [];
  let current = departure;

  while (pending.length > 0) {
    const next = await selectNextItem(current, pending, getLocation, options, travelModes);
    const pendingIndex = pending.findIndex((item) => item.originalIndex === next.originalIndex);

    ordered.push(next);
    pending.splice(pendingIndex, 1);
    current = getLocation(next.item);
  }

  return ordered;
};

const orderRouteablePlaces = async (
  departure: LatLng,
  routeablePlaces: PendingPlace[],
  options: GoogleFirstItineraryOptions,
  travelModes: TravelMode[],
) => {
  const ordered = await optimizeItemsByRoute({
    departure,
    getLocation: ({ place }) => ({ lat: place.lat, lng: place.lng }),
    items: routeablePlaces,
    options,
    travelModes,
  });

  return ordered.map(({ item, leg, origin, originalIndex }) => ({
    ...item,
    leg,
    origin,
    originalIndex,
  }));
};

const reindexPlaces = (
  ordered: OrderedPlace[],
  unroutable: PendingPlace[],
  departure: LatLng,
  startTime: string,
) => {
  let currentMinutes = parseTimeToMinutes(startTime);
  const routeable = ordered.map(({ leg, origin, place }, index) => {
    const travelMinutes = Math.max(0, leg.route.durationMinutes);
    const placeStart = currentMinutes + travelMinutes;
    const stayMinutes = sanitizeStayMinutes(place.estimatedMinutes);
    const placeEnd = placeStart + stayMinutes;
    const destination = { lat: place.lat, lng: place.lng };

    currentMinutes = placeEnd;

    return {
      ...place,
      endTime: formatMinutesToTime(placeEnd),
      order: index + 1,
      recommendationContext: {
        ...stripReturnRouteContext(place.recommendationContext),
        distanceFromDepartureMeters: Math.round(haversineMeters(departure, destination)),
        routeDistanceMeters: leg.route.distanceMeters,
        routeDurationMinutes: travelMinutes,
        routeTravelMode: leg.mode,
        sortMode: "route_optimized",
      },
      startTime: formatMinutesToTime(placeStart),
      travelFromPrevDistance: formatDistanceMeters(leg.route.distanceMeters),
      travelFromPrevMinutes: travelMinutes,
      travelMode: getTravelModeLabel(leg.mode),
    };
  });

  const appended = unroutable.map(({ place }, index) => {
    const placeStart = currentMinutes;
    const stayMinutes = sanitizeStayMinutes(place.estimatedMinutes);
    const placeEnd = placeStart + stayMinutes;

    currentMinutes = placeEnd;

    return {
      ...place,
      endTime: formatMinutesToTime(placeEnd),
      order: routeable.length + index + 1,
      recommendationContext: {
        ...stripReturnRouteContext(place.recommendationContext),
        sortMode: "route_optimized",
      },
      startTime: formatMinutesToTime(placeStart),
    };
  });

  return [...routeable, ...appended];
};

export const optimizeItineraryPlaceOrderByRoute = async ({
  departure,
  options,
  places,
  startTime,
  travelModes,
}: OptimizeItineraryPlaceOrderInput): Promise<ItineraryPlace[]> => {
  const indexedPlaces = places.map((place, originalIndex) => ({ originalIndex, place }));
  const routeable = indexedPlaces.filter(({ place }) => isFiniteCoordinate(place));
  const unroutable = indexedPlaces.filter(({ place }) => !isFiniteCoordinate(place));
  const ordered = await orderRouteablePlaces(departure, routeable, options, travelModes);

  return reindexPlaces(ordered, unroutable, departure, startTime);
};
