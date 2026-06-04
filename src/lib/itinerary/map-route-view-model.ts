import type { ItineraryPlace } from "@/lib/gemini/schema";
import type { TravelMode } from "./recommendation-policy";

export type LatLng = {
  lat: number;
  lng: number;
};

export type MapRoutePoint =
  | (LatLng & { kind: "accommodation" })
  | (LatLng & { kind: "place"; placeIndex: number });

export type MapRouteSegment = {
  destination: LatLng;
  destinationPlaceIndex?: number;
  distance?: string;
  minutes?: number;
  origin: LatLng;
  travelMode?: TravelMode;
};

type AccommodationCoordinateInput = {
  accommodationLat?: number | null;
  accommodationLng?: number | null;
};

type MapRoutePointInput = {
  accommodationCoords: LatLng | null;
  places: ItineraryPlace[];
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const resolveAccommodationCoords = ({
  accommodationLat,
  accommodationLng,
}: AccommodationCoordinateInput): LatLng | null => {
  if (!isFiniteNumber(accommodationLat) || !isFiniteNumber(accommodationLng)) {
    return null;
  }

  return { lat: accommodationLat, lng: accommodationLng };
};

export const resolveGoogleMapId = (mapId?: string) => {
  const normalized = mapId?.trim();

  if (!normalized || normalized === "DEMO_MAP_ID") return undefined;

  return normalized;
};

export const createMapRoutePoints = ({ accommodationCoords, places }: MapRoutePointInput): MapRoutePoint[] => {
  const orderedPlacePoints: MapRoutePoint[] = places
    .map((place, placeIndex) => ({ place, placeIndex }))
    .filter(({ place }) => isFiniteNumber(place.lat) && isFiniteNumber(place.lng))
    .sort((left, right) => left.place.order - right.place.order || left.placeIndex - right.placeIndex)
    .map(({ place, placeIndex }) => ({
      kind: "place",
      lat: place.lat,
      lng: place.lng,
      placeIndex,
    }));

  if (!accommodationCoords) {
    return orderedPlacePoints;
  }

  const accommodationPoint: MapRoutePoint = {
    kind: "accommodation",
    lat: accommodationCoords.lat,
    lng: accommodationCoords.lng,
  };

  if (orderedPlacePoints.length === 0) {
    return [accommodationPoint];
  }

  return [accommodationPoint, ...orderedPlacePoints, accommodationPoint];
};

export const createSelectedRouteSegment = (
  routePoints: MapRoutePoint[],
  selectedPlaceIndex?: number | null,
): MapRoutePoint[] => {
  if (selectedPlaceIndex == null) {
    return [];
  }

  const selectedRouteIndex = routePoints.findIndex(
    (point) => point.kind === "place" && point.placeIndex === selectedPlaceIndex,
  );

  if (selectedRouteIndex <= 0) {
    return [];
  }

  return [routePoints[selectedRouteIndex - 1], routePoints[selectedRouteIndex]];
};

export const createMapRouteSegments = (
  routePoints: MapRoutePoint[],
  places: ItineraryPlace[],
): MapRouteSegment[] =>
  routePoints.slice(1).map((destinationPoint, index) => {
    const originPoint = routePoints[index];
    const destination =
      destinationPoint.kind === "place" ? places[destinationPoint.placeIndex] : undefined;
    const previousPlace =
      originPoint?.kind === "place" ? places[originPoint.placeIndex] : undefined;
    const fallbackTravelMode = previousPlace?.recommendationContext?.routeTravelMode;

    return {
      destination: {
        lat: destinationPoint.lat,
        lng: destinationPoint.lng,
      },
      ...(destinationPoint.kind === "place"
        ? { destinationPlaceIndex: destinationPoint.placeIndex }
        : {}),
      ...(destination ? { distance: destination.travelFromPrevDistance } : {}),
      ...(destination ? { minutes: destination.travelFromPrevMinutes } : {}),
      origin: {
        lat: originPoint.lat,
        lng: originPoint.lng,
      },
      travelMode: destination?.recommendationContext?.routeTravelMode ?? fallbackTravelMode,
    };
  });

export type MapMarkerViewModel =
  | {
      id: "accommodation";
      kind: "accommodation";
      label: string;
      position: LatLng;
      tone: "lodging";
      title: string;
    }
  | {
      id: string;
      isMeal: boolean;
      isSelected: boolean;
      kind: "place";
      markerNumber: number;
      placeIndex: number;
      position: LatLng;
      title: string;
      tone: "meal" | "selected" | "default";
    };

export const createMapMarkerViewModels = ({
  accommodationCoords,
  places,
  selectedPlaceIndex,
}: {
  accommodationCoords: LatLng | null;
  places: ItineraryPlace[];
  selectedPlaceIndex?: number | null;
}): MapMarkerViewModel[] => {
  const models: MapMarkerViewModel[] = [];

  if (accommodationCoords) {
    models.push({
      id: "accommodation",
      kind: "accommodation",
      label: "숙소",
      position: accommodationCoords,
      tone: "lodging",
      title: "숙소",
    });
  }

  places.forEach((place, index) => {
    if (!isFiniteNumber(place.lat) || !isFiniteNumber(place.lng)) return;

    const isSelected = index === selectedPlaceIndex;
    const isMeal = place.mealSlot !== "none";
    const tone = isSelected ? "selected" : isMeal ? "meal" : "default";

    models.push({
      id: `place-${index}`,
      isMeal,
      isSelected,
      kind: "place",
      markerNumber: place.order,
      placeIndex: index,
      position: { lat: place.lat, lng: place.lng },
      title: place.koName || place.placeName,
      tone,
    });
  });

  return models;
};
