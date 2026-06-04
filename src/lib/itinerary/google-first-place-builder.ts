import type { ItineraryPlace } from "@/lib/gemini/schema";

import {
  getRadiusPolicyForTravelModes,
  type TravelMode,
  type LocalItineraryRecommendationRequest,
} from "./recommendation-policy";
import type { GoogleFirstItineraryOptions } from "./google-place-candidates";
import { computeRoute, getTravelModeLabel, type RouteSummary } from "./google-routes-api";
import type { ScoredCandidate } from "./google-itinerary-scoring";
import { resolvePhotoUrl } from "./place-photo-proxy";
import { resolveEffectiveItineraryBudgetStrategy } from "./budget-plan";

export const categoryByPrimaryType = (primaryType?: string, name?: string): ItineraryPlace["category"] => {
  const type = primaryType?.toLowerCase() ?? "";
  const normalizedName = name?.toLowerCase() ?? "";

  const isMarketOrStreet =
    normalizedName.includes("시장") ||
    normalizedName.includes("market") ||
    normalizedName.includes("야시장") ||
    normalizedName.includes("거리") ||
    normalizedName.includes("street") ||
    normalizedName.includes("푸드코트") ||
    type.includes("food_court") ||
    type.includes("food_truck");
  const isShoppingComplex =
    normalizedName.includes("canal city") ||
    normalizedName.includes("mall") ||
    normalizedName.includes("shopping") ||
    normalizedName.includes("department store") ||
    normalizedName.includes("plaza") ||
    type.includes("shopping_mall");

  if (isMarketOrStreet || isShoppingComplex) return "shopping";

  if (type.includes("restaurant") || type.includes("food")) return "restaurant";
  if (type.includes("cafe") || type.includes("bakery")) return "cafe";
  if (type.includes("market") || type.includes("shopping")) return "shopping";
  if (type.includes("park")) return "nature";
  if (type.includes("museum") || type.includes("art_gallery")) return "culture";
  return "attraction";
};

const durationByCategory: Record<ItineraryPlace["category"], number> = {
  accommodation: 0,
  attraction: 90,
  cafe: 45,
  culture: 90,
  nature: 60,
  restaurant: 75,
  shopping: 90,
};

const reasonIntroByCategory: Record<ItineraryPlace["category"], string> = {
  accommodation: "숙소를 기준으로 하루 동선을 연결합니다.",
  attraction: "도시의 대표 분위기와 랜드마크를 확인하기 좋은 명소입니다.",
  cafe: "일정 중 잠시 쉬며 분위기를 바꾸기 좋은 카페/휴식 장소입니다.",
  culture: "도시와 지역 문화를 깊게 확인하기 좋은 문화 공간입니다.",
  nature: "도심 이동 중 산책하며 쉬기 좋은 자연 코스입니다.",
  restaurant: "하루 동선 안에서 식사 시간을 채우기 좋은 현지 미식 장소입니다.",
  shopping: "기념품과 현지 상권을 둘러보기 좋은 쇼핑/체험 코스입니다.",
};

const priceLevelLabels: Record<string, string> = {
  PRICE_LEVEL_EXPENSIVE: "비쌈",
  PRICE_LEVEL_FREE: "무료",
  PRICE_LEVEL_INEXPENSIVE: "저렴",
  PRICE_LEVEL_MODERATE: "보통",
  PRICE_LEVEL_VERY_EXPENSIVE: "매우 비쌈",
};

const formatDistanceMeters = (distanceMeters: number) =>
  distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

const addMinutes = (time: string, minutes: number) => {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hours, mins + minutes));

  return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`;
};

const createDescription = (candidate: ScoredCandidate) => {
  const category = categoryByPrimaryType(candidate.primaryType, candidate.name);
  const ratingText = candidate.rating ? `평점 ${candidate.rating}` : "평점 정보 없음";
  const reviewText = candidate.userRatingCount
    ? `리뷰 ${candidate.userRatingCount.toLocaleString()}개`
    : "리뷰 수 정보 없음";
  const openingText =
    candidate.openingNow === true
      ? "현재 영업 중"
      : candidate.openingNow === false
        ? "현재 영업시간 외"
        : "영업시간 정보 없음";

  return `${reasonIntroByCategory[category]} 선택한 취향(${candidate.sourceTheme})과 일치하며 ${ratingText}, ${reviewText}, ${openingText} 기준으로 추천했습니다.`;
};

const createEstimatedCost = (candidate: ScoredCandidate) => {
  if (candidate.priceRangeText) return candidate.priceRangeText;
  if (candidate.priceLevel) {
    return `Google 가격: ${priceLevelLabels[candidate.priceLevel] ?? candidate.priceLevel}`;
  }
  return "Google Places 가격 정보 미제공";
};

const resolveMealSlot = (
  candidate: ScoredCandidate,
  request: LocalItineraryRecommendationRequest,
  arrivalTime: string,
): ItineraryPlace["mealSlot"] => {
  if (candidate.preferenceKind !== "food") return "none";

  const category = categoryByPrimaryType(candidate.primaryType, candidate.name);
  if (category !== "restaurant" && category !== "cafe") return "none";

  if (category === "cafe") return "snack";
  return "meal";
};

const uniqueTravelModes = (allowedModes: TravelMode[]) =>
  [...new Set(allowedModes.length > 0 ? allowedModes : ["WALK"])] as TravelMode[];

/** ?대룞?섎떒蹂?理쒕? ?덉슜 ?대룞 ?쒓컙(遺?. 珥덇낵 ???대떦 ?섎떒? 鍮꾪슚?⑤줈 ?먯젙 */
const TRAVEL_MODE_MAX_DURATION_MINUTES: Record<TravelMode, number> = {
  WALK: 20,
  BICYCLE: 20,
  TRANSIT: 60,
  DRIVE: 90,
};

const WALK_PRIORITY_MAX_DISTANCE_METERS = 1200;
const WALK_PRIORITY_MAX_DURATION_MINUTES = 20;

const routeRankValue = (route: RouteSummary) =>
  route.durationMinutes > 0 ? route.durationMinutes : Number.POSITIVE_INFINITY;

export const selectBestRouteOption = (
  options: Array<{ mode: TravelMode; route: RouteSummary }>,
) => {
  const usableOptions = options.filter((option) => option.route.durationMinutes > 0);
  const rankedOptions = usableOptions.length > 0 ? usableOptions : options;

  // ?대룞?섎떒蹂?理쒕? ?쒓컙 珥덇낵 ?듭뀡 ?쒖쇅 (?꾨? 珥덇낵硫?洹몃?濡??좎?)
  const withinThreshold = rankedOptions.filter(
    (option) => option.route.durationMinutes <= TRAVEL_MODE_MAX_DURATION_MINUTES[option.mode],
  );
  const effectiveOptions = withinThreshold.length > 0 ? withinThreshold : rankedOptions;

  const walkingOption = effectiveOptions.find(
    (option) =>
      option.mode === "WALK" &&
      option.route.distanceMeters > 0 &&
      option.route.distanceMeters <= WALK_PRIORITY_MAX_DISTANCE_METERS &&
      option.route.durationMinutes <= WALK_PRIORITY_MAX_DURATION_MINUTES,
  );

  if (walkingOption) return walkingOption;

  const [bestOption] = [...effectiveOptions].sort((left, right) => {
    const durationDiff = routeRankValue(left.route) - routeRankValue(right.route);
    if (durationDiff !== 0) return durationDiff;
    return left.route.distanceMeters - right.route.distanceMeters;
  });

  return bestOption;
};

const computeBestRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options: GoogleFirstItineraryOptions,
  allowedModes: TravelMode[],
) => {
  const routeOptions = await Promise.all(
    uniqueTravelModes(allowedModes).map(async (mode) => ({
      mode,
      route: await computeRoute(origin, destination, { ...options, travelMode: mode }),
    })),
  );

  return selectBestRouteOption(routeOptions);
};

export const createGoogleFirstItineraryPlace = async ({
  candidate,
  index,
  options,
  origin,
  precomputedBestRoute,
  request,
  startTime,
}: {
  candidate: ScoredCandidate;
  index: number;
  options: GoogleFirstItineraryOptions;
  origin: { lat: number; lng: number };
  precomputedBestRoute?: { mode: TravelMode; route: RouteSummary };
  request: LocalItineraryRecommendationRequest;
  startTime: string;
}): Promise<{ nextStartTime: string; place: ItineraryPlace }> => {
  const category = categoryByPrimaryType(candidate.primaryType, candidate.name);
  const allowedModes = (request.travelModes as TravelMode[]) ?? ["WALK"];
  const radiusPolicy = getRadiusPolicyForTravelModes(allowedModes);
  const bestRoute =
    precomputedBestRoute ?? (await computeBestRoute(origin, candidate.location, options, allowedModes));
  const travel = bestRoute.route;
  const bestMode = bestRoute.mode;
  const start = addMinutes(startTime, travel.durationMinutes);
  const estimatedMinutes = durationByCategory[category];
  const end = addMinutes(start, estimatedMinutes);
  const routeDistanceMeters =
    travel.distanceMeters ?? Math.round(candidate.distanceMetersFromDeparture);

  return {
    nextStartTime: end,
    place: {
      category,
      description: createDescription(candidate),
      endTime: end,
      estimatedCost: createEstimatedCost(candidate),
      estimatedMinutes,
      koName: candidate.name,
      lat: candidate.location.lat,
      lng: candidate.location.lng,
      mealSlot: resolveMealSlot(candidate, request, start),
      order: index + 1,
      placeIntroduction: "Gemini 장소 소개를 생성하지 못했습니다.",
      placeName: candidate.name,
      recommendationContext: {
        businessStatus: candidate.businessStatus,
        distanceFromDepartureMeters: Math.round(candidate.distanceMetersFromDeparture),
        expandedRadiusMeters: radiusPolicy.expanded,
        matchedPreference: candidate.sourceTheme,
        maxRadiusMeters: radiusPolicy.hardCap,
        openingNow: candidate.openingNow,
        preferenceKind: candidate.preferenceKind,
        budgetStrategy: resolveEffectiveItineraryBudgetStrategy(request.budgetPlan),
        priceLevel: candidate.priceLevel,
        priceRangeText: candidate.priceRangeText,
        rating: candidate.rating,
        routeDistanceMeters,
        routeDurationMinutes: travel.durationMinutes,
        routeTravelMode: bestMode,
        score: candidate.score,
        searchRadiusMeters: request.searchRadiusMeters ?? radiusPolicy.default,
        sortMode: request.sortMode,
        source: "google_places",
        travelModes: allowedModes,
        userRatingCount: candidate.userRatingCount,
      },
      startTime: start,
      theme: candidate.sourceTheme,
      travelFromPrevDistance: travel.distanceMeters
        ? formatDistanceMeters(travel.distanceMeters)
        : formatDistanceMeters(candidate.distanceMetersFromDeparture),
      travelFromPrevMinutes: travel.durationMinutes,
      travelMode: getTravelModeLabel(bestMode),
      photoUrl: candidate.photoName
        ? resolvePhotoUrl(candidate.photoName, 400, options.googleApiKey)
        : undefined,
      googlePlaceId: candidate.id,
    },
  };
};
