import type { ItineraryPlace } from "@/lib/gemini/schema";
import {
  RECOMMENDATION_SCORE_WEIGHTS,
  type TravelMode,
  getRadiusPolicyForTravelModes,
} from "./recommendation-policy";
import { getBudgetStrategyLabel, type ItineraryBudgetPlan } from "./budget-plan";

export interface RecommendationCriteriaViewModel {
  dataBasisLabel: string;
  exclusionLabel: string;
  budgetLabel: string;
  signalLabels: string[];
  sortLabel: string;
  sourceLabel: string;
}

export interface PlaceViewModel {
  koName: string;
  lat: number;
  lng: number;
  placeIntroduction?: string;
  placeName: string;
}

const priceLevelLabels: Record<string, string> = {
  PRICE_LEVEL_EXPENSIVE: "Expensive",
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "Inexpensive",
  PRICE_LEVEL_MODERATE: "Moderate",
  PRICE_LEVEL_VERY_EXPENSIVE: "Very expensive",
};

export const formatDistanceForEvidence = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;

const getPrimaryContext = (places: ItineraryPlace[]) =>
  places.find((place) => place.recommendationContext)?.recommendationContext;

const getSourceLabel = (source?: string) => {
  if (source === "google_places") return "Google Places + Routes";
  if (source === "gemini") return "Gemini fallback";
  return "Recommendation basis";
};

const getDataBasisLabel = (source?: string) => {
  if (source === "google_places") {
    return "Google place candidates scored with route efficiency and user-fit signals.";
  }
  if (source === "gemini") {
    return "AI-generated fallback because Google place details are unavailable.";
  }
  return "Recommendation policy used for result generation.";
};

const getBudgetPolicyLabel = (
  context: ReturnType<typeof getPrimaryContext>,
  budgetPlan?: ItineraryBudgetPlan,
) => {
  const strategy = context?.budgetStrategy ?? budgetPlan?.strategy ?? "balanced";
  const dailyBudget = budgetPlan?.dailyBudgetKrw
    ? `, daily ${budgetPlan.dailyBudgetKrw.toLocaleString("ko-KR")} KRW`
    : "";

  if (strategy === "saving") {
    return `Budget strategy ${getBudgetStrategyLabel(strategy)}${dailyBudget}: prioritize free or low-cost places and avoid high-price candidates.`;
  }

  if (strategy === "experience") {
    return `Budget strategy ${getBudgetStrategyLabel(strategy)}${dailyBudget}: allow higher-cost candidates when rating and experience value are strong.`;
  }

  return `Budget strategy ${getBudgetStrategyLabel(strategy)}${dailyBudget}: balance moderate cost, rating, and route efficiency.`;
};

export const createRecommendationCriteriaViewModel = (
  places: ItineraryPlace[] = [],
  budgetPlan?: ItineraryBudgetPlan,
): RecommendationCriteriaViewModel => {
  const context = getPrimaryContext(places);
  const travelModes = context?.travelModes as TravelMode[] | undefined;
  const radiusPolicy = getRadiusPolicyForTravelModes(travelModes);

  return {
    budgetLabel: getBudgetPolicyLabel(context, budgetPlan),
    dataBasisLabel: getDataBasisLabel(context?.source),
    exclusionLabel: "Exclude unsupported cities, missing coordinates, and unavailable place candidates.",
    signalLabels: [
      `Route efficiency ${RECOMMENDATION_SCORE_WEIGHTS.routeEfficiency} pts`,
      `Google rating/reviews ${RECOMMENDATION_SCORE_WEIGHTS.googlePopularity} pts`,
      `Opening-hours fit ${RECOMMENDATION_SCORE_WEIGHTS.openingHoursFit} pts`,
      `Budget fit ${RECOMMENDATION_SCORE_WEIGHTS.budgetFit} pts`,
      `Category diversity ${RECOMMENDATION_SCORE_WEIGHTS.categoryDiversity} pts`,
    ],
    sortLabel:
      context?.sortMode === "distance"
        ? "Closest-first order"
        : context?.sortMode === "popularity"
          ? "Popularity and rating order"
          : "Top-scoring candidates reordered for route efficiency.",
    sourceLabel: getSourceLabel(context?.source),
  };
};

export const createPlaceEvidenceBadges = (place: ItineraryPlace) => {
  const context = place.recommendationContext;
  if (!context) return [];

  const badges = [
    context.matchedPreference ? `Preference: ${context.matchedPreference}` : undefined,
    typeof context.distanceFromDepartureMeters === "number"
      ? `From departure ${formatDistanceForEvidence(context.distanceFromDepartureMeters)}`
      : undefined,
    typeof context.rating === "number" ? `Rating ${context.rating}` : undefined,
    typeof context.userRatingCount === "number"
      ? `Reviews ${context.userRatingCount.toLocaleString("ko-KR")}`
      : undefined,
    context.openingNow === true
      ? "Open now"
      : context.openingNow === false
        ? "Opening hours unavailable"
        : undefined,
    context.priceRangeText
      ? `Price ${context.priceRangeText}`
      : context.priceLevel
        ? `Price level ${priceLevelLabels[context.priceLevel] ?? context.priceLevel}`
        : undefined,
    context.budgetStrategy ? `Budget ${getBudgetStrategyLabel(context.budgetStrategy)}` : undefined,
    typeof context.score === "number" ? `Score ${context.score}` : undefined,
  ];

  return badges.filter((badge): badge is string => Boolean(badge));
};
