import type { GooglePlaceSearchIntent, LocalItineraryRecommendationRequest } from "./recommendation-policy";
import { placesSearchCache } from "./api-cache";

export type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface GoogleFirstItineraryOptions {
  fetcher?: Fetcher;
  googleApiKey: string;
}

export interface GooglePlace {
  businessStatus?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  id?: string;
  location?: { latitude?: number; longitude?: number };
  photos?: Array<{
    name?: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{ displayName?: string; uri?: string }>;
  }>;
  priceLevel?: string;
  priceRange?: {
    endPrice?: { currencyCode?: string; nanos?: number; units?: number | string };
    startPrice?: { currencyCode?: string; nanos?: number; units?: number | string };
  };
  primaryType?: string;
  rating?: number;
  regularOpeningHours?: { openNow?: boolean };
  userRatingCount?: number;
  websiteUri?: string;
}

const PLACES_NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const PLACES_FIELD_MASK = [
  "places.businessStatus",
  "places.displayName",
  "places.formattedAddress",
  "places.googleMapsUri",
  "places.id",
  "places.location",
  "places.photos",
  "places.priceLevel",
  "places.priceRange",
  "places.primaryType",
  "places.rating",
  "places.regularOpeningHours",
  "places.userRatingCount",
  "places.websiteUri",
].join(",");

const createSearchCircle = (
  request: LocalItineraryRecommendationRequest,
  radius: number,
) => ({
  center: {
    latitude: request.departure.lat,
    longitude: request.departure.lng,
  },
  radius,
});

const getCandidateCollectionRadius = (intent: GooglePlaceSearchIntent) =>
  intent.maxRadiusMeters;

const createHeaders = (apiKey: string) => ({
  "Content-Type": "application/json",
  "X-Goog-Api-Key": apiKey,
  "X-Goog-FieldMask": PLACES_FIELD_MASK,
});

const fetchPlaces = async (
  url: string,
  body: Record<string, unknown>,
  { fetcher = fetch, googleApiKey }: GoogleFirstItineraryOptions,
): Promise<GooglePlace[]> => {
  const cacheKey = JSON.stringify({ url, body });
  const cached = placesSearchCache.get(cacheKey);
  if (cached) return cached as GooglePlace[];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetcher(url, {
      body: JSON.stringify(body),
      headers: createHeaders(googleApiKey),
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const payload = (await response.json()) as { places?: GooglePlace[] };
    const places = payload.places ?? [];
    placesSearchCache.set(cacheKey, places);
    return places;
  } catch (error) {
    clearTimeout(timeoutId);
    return [];
  }
};

const EXCLUDED_PRIMARY_TYPES = [
  "hotel", "motel", "hostel", "lodging", "resort_hotel",
  "inn", "bed_and_breakfast", "guest_house",
  "camping_cabin", "cottage", "farmstay", "private_guest_room"
];

export const fetchNearbyGooglePlaces = async (
  request: LocalItineraryRecommendationRequest,
  intent: GooglePlaceSearchIntent,
  options: GoogleFirstItineraryOptions,
) =>
  fetchPlaces(
    PLACES_NEARBY_SEARCH_URL,
    {
      includedTypes: intent.includedTypes,
      excludedPrimaryTypes: EXCLUDED_PRIMARY_TYPES,
      languageCode: "ko",
      locationRestriction: {
        circle: createSearchCircle(request, getCandidateCollectionRadius(intent)),
      },
      maxResultCount: 10,
      rankPreference: intent.rankPreference,
    },
    options,
  );

export const fetchTextGooglePlaces = async (
  request: LocalItineraryRecommendationRequest,
  intent: GooglePlaceSearchIntent,
  options: GoogleFirstItineraryOptions,
) => {
  const results = await Promise.all(
    intent.searchQueries.map(async (query) => {
      const destination = [request.city, request.country].filter(Boolean).join(" ");
      const textQuery = [query, destination].filter(Boolean).join(" ");
      return fetchPlaces(
        PLACES_TEXT_SEARCH_URL,
        {
          languageCode: "ko",
          locationBias: {
            circle: createSearchCircle(request, getCandidateCollectionRadius(intent)),
          },
          pageSize: 10,
          textQuery,
        },
        options,
      );
    }),
  );

  return results.flat();
};

export const resolveGooglePlaceLocation = async (
  address: string,
  options: GoogleFirstItineraryOptions,
) => {
  const [place] = await fetchPlaces(
    PLACES_TEXT_SEARCH_URL,
    {
      languageCode: "ko",
      pageSize: 1,
      textQuery: address,
    },
    options,
  );
  const lat = place?.location?.latitude;
  const lng = place?.location?.longitude;

  if (typeof lat !== "number" || !Number.isFinite(lat)) return null;
  if (typeof lng !== "number" || !Number.isFinite(lng)) return null;

  return {
    address: place.formattedAddress ?? address,
    lat,
    lng,
  };
};
