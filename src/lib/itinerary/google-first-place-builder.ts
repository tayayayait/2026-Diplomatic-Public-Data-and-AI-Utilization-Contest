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

const categoryByPrimaryType = (primaryType?: string, name?: string): ItineraryPlace["category"] => {
  const type = primaryType?.toLowerCase() ?? "";
  const normalizedName = name?.toLowerCase() ?? "";

  const isMarketOrStreet =
    normalizedName.includes("?쒖옣") ||
    normalizedName.includes("market") ||
    normalizedName.includes("?쇱떆??) ||"
    normalizedName.includes("嫄곕━") ||
    normalizedName.includes("street") ||
    normalizedName.includes("?몃뱶肄뷀듃") ||
    type.includes("food_court") ||
    type.includes("food_truck");

  if (isMarketOrStreet) return "shopping";

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
  accommodation: "?숈냼瑜?湲곗??쇰줈 ?섎（ ?숈꽑???곌껐?⑸땲??",
  attraction: "?꾩떆?????遺꾩쐞湲곗? ?쒕뱶留덊겕瑜??뺤씤?섍린 醫뗭? 紐낆냼?낅땲??",
  cafe: "?쇱젙 以??좎떆 ?щ㈃??遺꾩쐞湲곕? 諛붽씀湲?醫뗭? 移댄럹/?댁떇 ?μ냼?낅땲??",
  culture: "?꾩떆? 吏??臾명솕瑜?吏㏐쾶 ?뺤씤?섍린 醫뗭? 臾명솕 怨듦컙?낅땲??",
  nature: "?꾩떖 ?대룞 以??곗콉?섎ŉ ?ш린 醫뗭? ?먯뿰 肄붿뒪?낅땲??",
  restaurant: "?섎（ ?숈꽑 ?덉뿉???앹궗 ?쒓컙??梨꾩슦湲?醫뗭? ?꾩? ?뚯떇 ?μ냼?낅땲??",
  shopping: "湲곕뀗?덇낵 ?꾩? ?곴텒???섎윭蹂닿린 醫뗭? ?쇳븨/泥댄뿕 肄붿뒪?낅땲??",
};

const priceLevelLabels: Record<string, string> = {
  PRICE_LEVEL_EXPENSIVE: "鍮꾩뙂",
  PRICE_LEVEL_FREE: "臾대즺",
  PRICE_LEVEL_INEXPENSIVE: "???",
  PRICE_LEVEL_MODERATE: "蹂댄넻",
  PRICE_LEVEL_VERY_EXPENSIVE: "留ㅼ슦 鍮꾩뙂",
};

const formatDistanceMeters = (distanceMeters: number) =>
  distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

const addMinutes = (time: string, minutes: number) => {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hours, mins + minutes));

  return `${date.getUTCHours().toString().padStart(2, "0")}:${date`
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}``;
};

const createDescription = (candidate: ScoredCandidate) => {
  const category = categoryByPrimaryType(candidate.primaryType, candidate.name);
  const ratingText = candidate.rating ? `?됱젏 ${candidate.rating}` : "?됱젏 ?뺣낫 ?놁쓬";
  const reviewText = candidate.userRatingCount
    ? `由щ럭 ${candidate.userRatingCount.toLocaleString()}媛?`
    : "由щ럭 ???뺣낫 ?놁쓬";
  const openingText =
    candidate.openingNow === true
      ? "?꾩옱 ?곸뾽 以?"
      : candidate.openingNow === false
        ? "?꾩옱 ?곸뾽?쒓컙 ??"
        : "?곸뾽?쒓컙 ?뺣낫 ?놁쓬";

  return `${reasonIntroByCategory[category]} ?좏깮??痍⑦뼢(${candidate.sourceTheme})怨??쇱튂?섎ŉ ${ratingText}, ${reviewText}, ${openingText} 湲곗??쇰줈 異붿쿇?덉뒿?덈떎.`;
};

const createEstimatedCost = (candidate: ScoredCandidate) => {
  if (candidate.priceRangeText) return candidate.priceRangeText;
  if (candidate.priceLevel) {
    return `Google 媛寃⑸?: ${priceLevelLabels[candidate.priceLevel] ?? candidate.priceLevel}`;
  }
  return "Google Places 媛寃??꾨뱶 誘몄젣怨?";
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
  request,
  startTime,
}: {
  candidate: ScoredCandidate;
  index: number;
  options: GoogleFirstItineraryOptions;
  origin: { lat: number; lng: number };
  request: LocalItineraryRecommendationRequest;
  startTime: string;
}): Promise<{ nextStartTime: string; place: ItineraryPlace }> => {
  const category = categoryByPrimaryType(candidate.primaryType, candidate.name);
  const allowedModes = (request.travelModes as TravelMode[]) ?? ["WALK"];
  const radiusPolicy = getRadiusPolicyForTravelModes(allowedModes);
  const bestRoute = await computeBestRoute(origin, candidate.location, options, allowedModes);
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
      placeIntroduction: "Gemini ?μ냼 ?뚭컻瑜??앹꽦?섏? 紐삵뻽?듬땲??",
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
