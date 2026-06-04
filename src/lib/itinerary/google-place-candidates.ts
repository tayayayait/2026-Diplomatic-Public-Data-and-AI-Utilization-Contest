import {
  buildGooglePlaceSearchIntents,
  isLodgingType,
  localItineraryRecommendationRequestSchema,
  type GooglePlaceSearchIntent,
  type TravelMode,
} from "./recommendation-policy";
import {
  fetchNearbyGooglePlaces,
  fetchTextGooglePlaces,
  type GoogleFirstItineraryOptions,
  type GooglePlace,
} from "./google-places-api";
import {
  isSimilarPlaceName,
  normalizePlaceIdentifier,
} from "./place-deduplication";

export type { Fetcher, GoogleFirstItineraryOptions } from "./google-places-api";

export interface CandidateLocation {
  lat: number;
  lng: number;
}

export interface GooglePlaceCandidate {
  address?: string;
  businessStatus?: string;
  googleMapsUri?: string;
  id?: string;
  location: CandidateLocation;
  name: string;
  openingNow?: boolean;
  photoName?: string;
  preferenceKind: "food" | "place";
  priceLevel?: string;
  priceRangeText?: string;
  primaryType?: string;
  rating?: number;
  searchIntent: GooglePlaceSearchIntent;
  sourceTheme: string;
  userRatingCount?: number;
  websiteUri?: string;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatGoogleMoney = (
  money?: { currencyCode?: string; nanos?: number; units?: number | string },
) => {
  if (!money?.currencyCode) return undefined;
  const value = Number(money.units ?? 0) + Number(money.nanos ?? 0) / 1_000_000_000;
  if (!Number.isFinite(value)) return undefined;

  return new Intl.NumberFormat("ko-KR", {
    currency: money.currencyCode,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
    style: "currency",
  }).format(value);
};

const formatPriceRange = (priceRange: GooglePlace["priceRange"]) => {
  const start = formatGoogleMoney(priceRange?.startPrice);
  const end = formatGoogleMoney(priceRange?.endPrice);

  if (start && end) return `${start}~${end}`;
  if (start) return `${start} ?댁긽`;
  if (end) return `${end} ?댄븯`;
  return undefined;
};

export const normalizeGooglePlaceCandidate = (
  place: GooglePlace,
  intent: GooglePlaceSearchIntent,
): GooglePlaceCandidate | null => {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const name = place.displayName?.text?.trim();

  if (!name || !isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;

  return {
    address: place.formattedAddress,
    businessStatus: place.businessStatus,
    googleMapsUri: place.googleMapsUri,
    id: place.id,
    location: { lat, lng },
    name,
    openingNow: place.regularOpeningHours?.openNow,
    photoName: place.photos?.[0]?.name,
    preferenceKind: intent.preferenceKind,
    priceLevel: place.priceLevel,
    priceRangeText: formatPriceRange(place.priceRange),
    primaryType: place.primaryType,
    rating: place.rating,
    searchIntent: intent,
    sourceTheme: intent.sourceTheme,
    userRatingCount: place.userRatingCount,
    websiteUri: place.websiteUri,
  };
};

export const dedupeGooglePlaceCandidates = (candidates: GooglePlaceCandidate[]) => {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key =
      candidate.id ??
      `${candidate.name.toLowerCase()}|${candidate.address?.toLowerCase() ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const isExcludedCandidate = (
  candidate: GooglePlaceCandidate,
  request: ReturnType<typeof localItineraryRecommendationRequestSchema.parse>,
) => {
  if (isLodgingType(candidate.primaryType)) return true;

  const excludedIds = new Set(request.excludedGooglePlaceIds.map(normalizePlaceIdentifier));
  const candidateId = candidate.id ? normalizePlaceIdentifier(candidate.id) : "";

  return (
    Boolean(candidateId && excludedIds.has(candidateId)) ||
    request.excludedPlaceNames.some((excludedName) =>
      isSimilarPlaceName(candidate.name, excludedName),
    )
  );
};

export const collectGooglePlaceCandidates = async (
  rawRequest: unknown,
  options: GoogleFirstItineraryOptions,
): Promise<GooglePlaceCandidate[]> => {
  const request = localItineraryRecommendationRequestSchema.parse(rawRequest);
  const travelModes = (request.travelModes ?? ["WALK"]) as TravelMode[];
  const intents = buildGooglePlaceSearchIntents({
    foodThemes: request.includeMeals ? request.foodThemes : [],
    vibeThemes: request.vibeThemes,
    travelModes: travelModes,
  });
  const results = await Promise.all(
    intents.map(async (intent) => {
      const googlePlaces =
        intent.includedTypes.length > 0
          ? await fetchNearbyGooglePlaces(request, intent, options)
          : await fetchTextGooglePlaces(request, intent, options);

      return googlePlaces
        .map((place) => normalizeGooglePlaceCandidate(place, intent))
        .filter((candidate): candidate is GooglePlaceCandidate => candidate !== null);
    })
  );

  const candidates: GooglePlaceCandidate[] = results.flat();

  return dedupeGooglePlaceCandidates(candidates).filter((candidate) => !isExcludedCandidate(candidate, request));
};

