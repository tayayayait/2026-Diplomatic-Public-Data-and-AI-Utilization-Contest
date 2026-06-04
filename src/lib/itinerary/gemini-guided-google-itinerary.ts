import type { ItineraryPlace } from "@/lib/gemini/schema";

import {
  dedupeGooglePlaceCandidates,
  normalizeGooglePlaceCandidate,
  type GoogleFirstItineraryOptions,
  type GooglePlaceCandidate,
} from "./google-place-candidates";
import { fetchTextGooglePlaces, resolveGooglePlaceLocation } from "./google-places-api";
import { getTravelModeLabel } from "./google-routes-api";
import {
  getRadiusPolicyForTravelModes,
  getItineraryCompositionPolicy,
  isLodgingType,
  localItineraryRecommendationRequestSchema,
  selectTargetPlaceCount,
  type GooglePlaceSearchIntent,
  type LocalItineraryRecommendationRequest,
  type RecommendationPreferenceKind,
  type TravelMode,
} from "./recommendation-policy";
import { haversineMeters, type ScoredCandidate } from "./google-itinerary-scoring";
import { resolveEffectiveItineraryBudgetStrategy } from "./budget-plan";
import {
  isSimilarPlaceName,
  normalizePlaceIdentifier,
} from "./place-deduplication";
import { categoryByPrimaryType } from "./google-first-place-builder";
import { resolvePhotoUrl } from "./place-photo-proxy";
import { attachAccommodationReturnRoute } from "./return-route";
import { optimizeItineraryPlaceOrderByRoute } from "./route-order-optimizer";

type ParsedRequest = ReturnType<typeof localItineraryRecommendationRequestSchema.parse>;

const GOOGLE_PRICE_LEVEL_LABELS: Record<string, string> = {
  PRICE_LEVEL_EXPENSIVE: "expensive",
  PRICE_LEVEL_FREE: "free",
  PRICE_LEVEL_INEXPENSIVE: "inexpensive",
  PRICE_LEVEL_MODERATE: "moderate",
  PRICE_LEVEL_VERY_EXPENSIVE: "very expensive",
};

const FOOD_CATEGORIES: Array<ItineraryPlace["category"]> = ["restaurant", "cafe"];
const MIN_STAY_MINUTES = 30;
const MAX_STAY_MINUTES = 180;

const hasFiniteDepartureCoordinates = (departure: { lat?: number; lng?: number }) =>
  Number.isFinite(departure.lat) && Number.isFinite(departure.lng);

const resolveDeparture = async (
  rawRequest: ParsedRequest,
  options: GoogleFirstItineraryOptions,
): Promise<ParsedRequest | null> => {
  if (hasFiniteDepartureCoordinates(rawRequest.departure)) return rawRequest;

  const address = rawRequest.departure.address?.trim();
  if (!address) return null;

  const resolved = await resolveGooglePlaceLocation(address, options);
  if (!resolved) return null;

  return {
    ...rawRequest,
    departure: {
      address: resolved.address,
      lat: resolved.lat,
      lng: resolved.lng,
    },
  };
};

const uniqueStrings = (values: Array<string | undefined>) => [
  ...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
];

const getPreferenceKind = (place: ItineraryPlace): RecommendationPreferenceKind =>
  FOOD_CATEGORIES.includes(place.category) || place.mealSlot !== "none" ? "food" : "place";

const createSearchIntentForDraftPlace = (
  request: LocalItineraryRecommendationRequest,
  draftPlace: ItineraryPlace,
): GooglePlaceSearchIntent => {
  const radiusPolicy = getRadiusPolicyForTravelModes(request.travelModes);
  const sourceTheme = draftPlace.theme || draftPlace.category;

  return {
    defaultRadiusMeters: request.searchRadiusMeters,
    expandedRadiusMeters: radiusPolicy.expanded,
    includedTypes: [],
    maxRadiusMeters: radiusPolicy.hardCap,
    preferenceKind: getPreferenceKind(draftPlace),
    rankPreference: "POPULARITY",
    searchQueries: uniqueStrings([
      draftPlace.placeName,
      draftPlace.koName,
      `${draftPlace.placeName} ${sourceTheme}`,
    ]),
    sourceTheme,
  };
};

const isClosedCandidate = (candidate: GooglePlaceCandidate) =>
  candidate.businessStatus === "CLOSED_PERMANENTLY" ||
  candidate.businessStatus === "CLOSED_TEMPORARILY" ||
  candidate.openingNow === false;

const isExcludedCandidate = (
  candidate: GooglePlaceCandidate,
  request: LocalItineraryRecommendationRequest,
  selectedIds: Set<string>,
  selectedNames: string[],
) => {
  if (isLodgingType(candidate.primaryType)) return true;
  if (isClosedCandidate(candidate)) return true;

  const candidateId = candidate.id ? normalizePlaceIdentifier(candidate.id) : "";
  const excludedIds = new Set(request.excludedGooglePlaceIds.map(normalizePlaceIdentifier));
  if (candidateId && (excludedIds.has(candidateId) || selectedIds.has(candidateId))) return true;

  const excludedNames = [...request.excludedPlaceNames, ...selectedNames];
  return excludedNames.some((name) => isSimilarPlaceName(candidate.name, name));
};

const createScoredCandidate = (
  request: LocalItineraryRecommendationRequest,
  draftPlace: ItineraryPlace,
  candidate: GooglePlaceCandidate,
  currentLocation: { lat: number; lng: number },
): ScoredCandidate => {
  const distanceMetersFromDeparture = haversineMeters(
    currentLocation,
    candidate.location,
  );
  const distanceReferenceMeters = 5000;
  const distanceScore = Math.max(0, 30 * (1 - Math.min(distanceMetersFromDeparture, distanceReferenceMeters) / distanceReferenceMeters));
  const popularityScore =
    ((candidate.rating ?? 0) / 5) * 20 + Math.min((candidate.userRatingCount ?? 0) / 1000, 1) * 20;
  const openingScore = candidate.openingNow === true ? 15 : 5;
  const budgetScore = 10;
  const categoryScore = 5;

  return {
    ...candidate,
    distanceMetersFromDeparture, // Renamed internally or kept same for compatibility, but represents distance from current
    score: Math.round((distanceScore + popularityScore + openingScore + budgetScore + categoryScore) * 10) / 10,
  };
};

const collectMatchedCandidates = async (
  request: LocalItineraryRecommendationRequest,
  draftPlace: ItineraryPlace,
  options: GoogleFirstItineraryOptions,
) => {
  const intent = createSearchIntentForDraftPlace(request, draftPlace);
  const googlePlaces = await fetchTextGooglePlaces(request, intent, options);

  return dedupeGooglePlaceCandidates(
    googlePlaces
      .map((place) => normalizeGooglePlaceCandidate(place, intent))
      .filter((candidate): candidate is GooglePlaceCandidate => candidate !== null),
  );
};

const selectMatchedCandidate = (
  request: LocalItineraryRecommendationRequest,
  draftPlace: ItineraryPlace,
  candidates: GooglePlaceCandidate[],
  selectedIds: Set<string>,
  selectedNames: string[],
  currentLocation: { lat: number; lng: number },
) =>
  candidates
    .filter((candidate) => !isExcludedCandidate(candidate, request, selectedIds, selectedNames))
    .map((candidate) => createScoredCandidate(request, draftPlace, candidate, currentLocation))
    .sort((left, right) => right.score - left.score)[0] ?? null;



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

const clampStayMinutes = (minutes: number) =>
  Math.max(MIN_STAY_MINUTES, Math.min(MAX_STAY_MINUTES, Math.round(minutes)));

const formatDistanceMeters = (distanceMeters: number) =>
  distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

const createEstimatedCost = (candidate: ScoredCandidate) => {
  if (candidate.priceRangeText) return candidate.priceRangeText;
  if (candidate.priceLevel) {
    return `Google price: ${GOOGLE_PRICE_LEVEL_LABELS[candidate.priceLevel] ?? candidate.priceLevel}`;
  }
  return "Google Places price unavailable";
};

const getLastPlaceLocation = (places: ItineraryPlace[], fallback: { lat: number; lng: number }) => {
  const lastPlace = places.at(-1);

  return lastPlace && Number.isFinite(lastPlace.lat) && Number.isFinite(lastPlace.lng)
    ? { lat: lastPlace.lat, lng: lastPlace.lng }
    : fallback;
};

const normalizeMealSlot = (category: ItineraryPlace["category"]): ItineraryPlace["mealSlot"] => {
  if (category === "restaurant") return "meal";
  if (category === "cafe") return "snack";
  return "none";
};

const createDescription = (draftPlace: ItineraryPlace, candidate: ScoredCandidate) => {
  const rating = typeof candidate.rating === "number" ? ` Rating ${candidate.rating.toFixed(1)}.` : "";
  const reviewCount =
    typeof candidate.userRatingCount === "number"
      ? ` Reviews ${candidate.userRatingCount.toLocaleString("en-US")}.`
      : "";
  const opening =
    candidate.openingNow === true
      ? " Google opening status: open now."
      : " Google opening status: unavailable.";

  return `${draftPlace.description} Matched with Google Places: ${candidate.name}.${rating}${reviewCount}${opening}`;
};

const createPlaceWithoutRoute = ({
  candidate,
  draftPlace,
  googleApiKey,
  index,
  request,
}: {
  candidate: ScoredCandidate;
  draftPlace: ItineraryPlace;
  googleApiKey: string;
  index: number;
  request: LocalItineraryRecommendationRequest;
}): ItineraryPlace => {
  const radiusPolicy = getRadiusPolicyForTravelModes(request.travelModes);
  const routeDistanceMeters = Math.round(candidate.distanceMetersFromDeparture);
  const category = categoryByPrimaryType(candidate.primaryType, candidate.name);

  return {
    ...draftPlace,
    category,
    description: createDescription(draftPlace, candidate),
    endTime: "",
    estimatedCost: createEstimatedCost(candidate),
    googlePlaceId: candidate.id,
    koName: draftPlace.koName?.trim() || candidate.name,
    lat: candidate.location.lat,
    lng: candidate.location.lng,
    mealSlot: normalizeMealSlot(category),
    order: index + 1,
    photoUrl: candidate.photoName
      ? resolvePhotoUrl(candidate.photoName, 400, googleApiKey)
      : draftPlace.photoUrl,
    placeIntroduction: `[AI 추천: ${draftPlace.koName}] ${draftPlace.placeIntroduction ?? draftPlace.description}`,
    placeName: candidate.name,
    recommendationContext: {
      businessStatus: candidate.businessStatus,
      distanceFromDepartureMeters: Math.round(candidate.distanceMetersFromDeparture),
      expandedRadiusMeters: radiusPolicy.expanded,
      matchedPreference: draftPlace.theme,
      maxRadiusMeters: radiusPolicy.hardCap,
      openingNow: candidate.openingNow,
      preferenceKind: candidate.preferenceKind,
      budgetStrategy: resolveEffectiveItineraryBudgetStrategy(request.budgetPlan),
      priceLevel: candidate.priceLevel,
      priceRangeText: candidate.priceRangeText,
      rating: candidate.rating,
      routeDistanceMeters,
      routeDurationMinutes: 0,
      routeTravelMode: "WALK",
      score: candidate.score,
      searchRadiusMeters: request.searchRadiusMeters,
      sortMode: request.sortMode,
      source: "google_places",
      travelModes: request.travelModes,
      userRatingCount: candidate.userRatingCount,
    },
    startTime: "",
    theme: draftPlace.theme || candidate.sourceTheme,
    travelFromPrevDistance: "",
    travelFromPrevMinutes: 0,
    travelMode: "도보",
  };
};

export const createGeminiGuidedGoogleItinerary = async (
  rawRequest: unknown,
  draftPlaces: ItineraryPlace[],
  options: GoogleFirstItineraryOptions,
): Promise<ItineraryPlace[]> => {
  const parsedRequest = localItineraryRecommendationRequestSchema.parse(rawRequest);
  const request = await resolveDeparture(parsedRequest, options);
  if (!request) return [];

  const selectedIds = new Set(request.excludedGooglePlaceIds.map(normalizePlaceIdentifier));
  const selectedNames = [...request.excludedPlaceNames];
  const places: ItineraryPlace[] = [];
  const orderedDraftPlaces = [...draftPlaces].sort((left, right) => left.order - right.order);
  
  // Phase 1: Fetch all Google Places candidates in parallel
  const allCandidates = await Promise.all(
    orderedDraftPlaces.map((draftPlace) => collectMatchedCandidates(request, draftPlace, options))
  );

  let currentLocation = request.departure as { lat: number; lng: number };
  let currentMinutes = parseTimeToMinutes(request.startTime);
  const targetPlaceCount = selectTargetPlaceCount(request);
  const composition = getItineraryCompositionPolicy(request);
  let mealCount = 0;
  let snackCount = 0;

  for (const [index, draftPlace] of orderedDraftPlaces.entries()) {
    if (places.length >= targetPlaceCount) break;

    const candidates = allCandidates[index];
    const candidate = selectMatchedCandidate(
      request,
      draftPlace,
      candidates,
      selectedIds,
      selectedNames,
      currentLocation,
    );
    if (!candidate) continue;

    const stayMinutes = clampStayMinutes(draftPlace.estimatedMinutes);

    const place = createPlaceWithoutRoute({
      candidate,
      draftPlace: { ...draftPlace, estimatedMinutes: stayMinutes },
      googleApiKey: options.googleApiKey,
      index: places.length,
      request,
    });
    
    if (place.category === "restaurant" && mealCount >= composition.mealCount) continue;
    if (place.category === "cafe" && snackCount >= composition.snackCount) continue;
    
    places.push(place);

    if (place.category === "restaurant") mealCount += 1;
    if (place.category === "cafe") snackCount += 1;
    if (candidate.id) selectedIds.add(normalizePlaceIdentifier(candidate.id));
    selectedNames.push(candidate.name);
    if (draftPlace.placeName) selectedNames.push(draftPlace.placeName);
    if (draftPlace.koName) selectedNames.push(draftPlace.koName);
    currentLocation = candidate.location;
  }

  const optimizedPlaces = await optimizeItineraryPlaceOrderByRoute({
    departure: request.departure as { lat: number; lng: number },
    options,
    places,
    startTime: request.startTime,
    travelModes: request.travelModes,
  });
  const returnOrigin = getLastPlaceLocation(optimizedPlaces, currentLocation);

  return attachAccommodationReturnRoute({
    departure: request.departure as { lat: number; lng: number },
    options,
    places: optimizedPlaces,
    returnOrigin,
    travelModes: request.travelModes,
  });
};
