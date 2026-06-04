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
  breakfast: "식사",
  lunch: "식사",
  dinner: "식사",
  snack: "간식",
  meal: "식사",
  none: "일반 장소",
};

const categoryLabels: Record<TimelineCategory, string> = {
  accommodation: "숙소",
  attraction: "명소",
  cafe: "카페",
  culture: "문화",
  nature: "자연",
  restaurant: "식당",
  shopping: "쇼핑",
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
        ? ` · ${formatDistanceMeters(context.returnRouteDistanceMeters)}`
        : "";
    const travelMode = getTravelModeLabel(context?.returnRouteTravelMode);

    return {
      description: `${travelMode} ${returnMinutes}분${distance} 소요 (숙소로 복귀)`,
      title: "숙소로 복귀",
    };
  }

  if (lastPlace) {
    return {
      description: "마지막 장소에서 숙소로 복귀합니다. 경로 시간 정보는 제공되지 않습니다.",
      title: "숙소로 복귀",
    };
  }

  return {
    description: "오늘의 일정이 끝났습니다.",
    title: "숙소로 복귀",
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
