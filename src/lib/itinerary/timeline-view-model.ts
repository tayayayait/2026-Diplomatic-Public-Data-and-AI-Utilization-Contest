import type { ItineraryPlace } from "@/lib/gemini/schema";
import { getTravelModeLabel } from "./google-routes-api";

export type TimelineCategory = ItineraryPlace["category"];
export type TimelineMealSlot = ItineraryPlace["mealSlot"];

export interface TimelinePlaceViewModel {
  categoryLabel: string;
  estimatedCost: string;
  estimatedMinutes: number;
  index: number;
  isMeal: boolean;
  mealLabel: string;
  order: number;
  place: ItineraryPlace;
  placeIntroduction: string;
  timeRange: string;
  title: string;
  travelDistance: string;
  travelMinutes: number;
  photoUrl?: string;
}

export interface ReturnHomeStepViewModel {
  description: string;
  title: string;
}

const mealLabels: Record<TimelineMealSlot, string> = {
  breakfast: "Meal",
  lunch: "Meal",
  dinner: "Meal",
  snack: "Snack",
  meal: "Meal",
  none: "General stop",
};

const categoryLabels: Record<TimelineCategory, string> = {
  accommodation: "Accommodation",
  attraction: "Attraction",
  cafe: "Cafe",
  culture: "Culture",
  nature: "Nature",
  restaurant: "Restaurant",
  shopping: "Shopping",
};

export const getMealSlotLabel = (mealSlot: TimelineMealSlot) => mealLabels[mealSlot];

export const getCategoryLabel = (category: TimelineCategory) => categoryLabels[category];

const formatDistanceMeters = (distanceMeters: number) =>
  distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

const getLastScheduledPlace = (places: ItineraryPlace[]) =>
  [...places].sort((left, right) => left.order - right.order).at(-1);

export const createReturnHomeStep = (
  places: ItineraryPlace[] = [],
): ReturnHomeStepViewModel => {
  const lastPlace = getLastScheduledPlace(places);
  const context = lastPlace?.recommendationContext;
  const returnMinutes = context?.returnRouteDurationMinutes;

  if (typeof returnMinutes === "number" && returnMinutes > 0) {
    const distance =
      typeof context?.returnRouteDistanceMeters === "number"
        ? ` 쨌 ${formatDistanceMeters(context.returnRouteDistanceMeters)}`
        : "";
    const travelMode = getTravelModeLabel(context?.returnRouteTravelMode);

    return {
      description: `${travelMode} ${returnMinutes} min${distance} back to accommodation`,
      title: "Return to accommodation",
    };
  }

  if (lastPlace) {
    return {
      description: "Return to accommodation after the last stop. Route time is unavailable.",
      title: "Return to accommodation",
    };
  }

  return {
    description: "End of today's itinerary.",
    title: "Return to accommodation",
  };
};

export const createTimelinePlaceViewModels = (
  places: ItineraryPlace[],
): TimelinePlaceViewModel[] =>
  places
    .map((place, originalIndex) => ({ place, originalIndex }))
    .sort((a, b) => a.place.order - b.place.order)
    .map(({ place, originalIndex }) => {
      const isMeal = place.mealSlot !== "none";

      return {
        categoryLabel: getCategoryLabel(place.category),
        estimatedCost: place.estimatedCost,
        estimatedMinutes: place.estimatedMinutes,
        index: originalIndex,
        isMeal,
        mealLabel: getMealSlotLabel(place.mealSlot),
        order: place.order,
        place,
        placeIntroduction: place.placeIntroduction || "No place introduction available.",
        timeRange: `${place.startTime}-${place.endTime}`,
        title: place.koName,
        travelDistance: place.travelFromPrevDistance,
        travelMinutes: place.travelFromPrevMinutes,
        photoUrl: place.photoUrl,
      };
    });
