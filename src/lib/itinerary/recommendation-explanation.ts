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
  PRICE_LEVEL_EXPENSIVE: "비쌈",
  PRICE_LEVEL_FREE: "무료",
  PRICE_LEVEL_INEXPENSIVE: "저렴함",
  PRICE_LEVEL_MODERATE: "보통",
  PRICE_LEVEL_VERY_EXPENSIVE: "매우 비쌈",
};

export const formatDistanceForEvidence = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;

const getPrimaryContext = (places: ItineraryPlace[]) =>
  places.find((place) => place.recommendationContext)?.recommendationContext;

const getSourceLabel = (source?: string) => {
  if (source === "google_places") return "Google Places + Routes";
  if (source === "gemini") return "Gemini 대체 추천";
  return "추천 기준";
};

const getDataBasisLabel = (source?: string) => {
  if (source === "google_places") {
    return "경로 효율성과 사용자 적합도 신호로 점수를 매긴 Google 장소 후보입니다.";
  }
  if (source === "gemini") {
    return "Google 장소 세부 정보를 사용할 수 없어 AI가 생성한 대체 추천입니다.";
  }
  return "결과 생성에 사용된 추천 기준 정책입니다.";
};

const getBudgetPolicyLabel = (
  context: ReturnType<typeof getPrimaryContext>,
  budgetPlan?: ItineraryBudgetPlan,
) => {
  const strategy = context?.budgetStrategy ?? budgetPlan?.strategy ?? "balanced";
  const dailyBudget = budgetPlan?.dailyBudgetKrw
    ? `, 일일 ${budgetPlan.dailyBudgetKrw.toLocaleString("ko-KR")} KRW`
    : "";

  if (strategy === "saving") {
    return `예산 전략 ${getBudgetStrategyLabel(strategy)}${dailyBudget}: 무료 또는 저렴한 장소를 우선시하고 비싼 후보는 피합니다.`;
  }

  if (strategy === "experience") {
    return `예산 전략 ${getBudgetStrategyLabel(strategy)}${dailyBudget}: 평점과 경험 가치가 높을 경우 비용이 더 드는 후보도 허용합니다.`;
  }

  return `예산 전략 ${getBudgetStrategyLabel(strategy)}${dailyBudget}: 적당한 비용, 평점, 경로 효율성의 균형을 맞춥니다.`;
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
    exclusionLabel: "지원되지 않는 도시, 좌표가 누락되거나 이용할 수 없는 장소 후보를 제외합니다.",
    signalLabels: [
      `경로 효율성 ${RECOMMENDATION_SCORE_WEIGHTS.routeEfficiency}점`,
      `Google 평점/리뷰 ${RECOMMENDATION_SCORE_WEIGHTS.googlePopularity}점`,
      `영업시간 적합도 ${RECOMMENDATION_SCORE_WEIGHTS.openingHoursFit}점`,
      `예산 적합도 ${RECOMMENDATION_SCORE_WEIGHTS.budgetFit}점`,
      `카테고리 다양성 ${RECOMMENDATION_SCORE_WEIGHTS.categoryDiversity}점`,
    ],
    sortLabel:
      context?.sortMode === "distance"
        ? "가까운 순 정렬"
        : context?.sortMode === "popularity"
          ? "인기 및 평점 순 정렬"
          : "경로 효율성을 위해 점수가 높은 후보들을 재정렬했습니다.",
    sourceLabel: getSourceLabel(context?.source),
  };
};

export const createPlaceEvidenceBadges = (place: ItineraryPlace) => {
  const context = place.recommendationContext;
  if (!context) return [];

  const badges = [
    context.matchedPreference ? `취향: ${context.matchedPreference}` : undefined,
    typeof context.distanceFromDepartureMeters === "number"
      ? `출발지에서 ${formatDistanceForEvidence(context.distanceFromDepartureMeters)}`
      : undefined,
    typeof context.rating === "number" ? `평점 ${context.rating}` : undefined,
    typeof context.userRatingCount === "number"
      ? `리뷰 ${context.userRatingCount.toLocaleString("ko-KR")}개`
      : undefined,
    context.openingNow === true
      ? "현재 영업 중"
      : context.openingNow === false
        ? "영업시간 정보 없음"
        : undefined,
    context.priceRangeText
      ? `가격 ${context.priceRangeText}`
      : context.priceLevel
        ? `가격대 ${priceLevelLabels[context.priceLevel] ?? context.priceLevel}`
        : undefined,
    context.budgetStrategy ? `예산 ${getBudgetStrategyLabel(context.budgetStrategy)}` : undefined,
    typeof context.score === "number" ? `점수 ${context.score}점` : undefined,
  ];

  return badges.filter((badge): badge is string => Boolean(badge));
};
