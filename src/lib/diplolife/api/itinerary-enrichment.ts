import type {
  ItineraryContext,
  LocalItineraryResult,
  PlaceRecommendation,
  PlaceRecommendationType,
} from "./gemini-recommendation";

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

type LatLng = {
  latitude: number;
  longitude: number;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  websiteUri?: string;
  location?: LatLng;
  priceLevel?: string;
  priceRange?: GooglePriceRange;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  rating?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  types?: string[];
  reviews?: Array<{
    text?: { text?: string };
    rating?: number;
  }>;
  userRatingCount?: number;
};

type GoogleMoney = {
  currencyCode?: string;
  units?: string | number;
  nanos?: number;
};

type GooglePriceRange = {
  startPrice?: GoogleMoney;
  endPrice?: GoogleMoney;
};

type RouteSummary = {
  distanceMeters?: number;
  durationMinutes?: number;
};

const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.location",
  "places.priceLevel",
  "places.priceRange",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.rating",
  "places.regularOpeningHours",
  "places.reviews",
  "places.types",
  "places.userRatingCount",
].join(",");

const PLACE_DETAILS_FIELD_MASK = PLACES_FIELD_MASK.replaceAll("places.", "");
const ROUTES_FIELD_MASK = "routes.duration,routes.distanceMeters";
const NON_CONCRETE_PLACE_TYPES = new Set([
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "administrative_area_level_4",
  "administrative_area_level_5",
  "colloquial_area",
  "country",
  "geocode",
  "locality",
  "neighborhood",
  "political",
  "postal_code",
  "route",
  "street_address",
  "sublocality",
]);

export function parseGoogleDurationToMinutes(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return undefined;

  return Math.max(1, Math.round(Number(match[1]) / 60));
}

export function formatDistanceMeters(distanceMeters?: number): string | undefined {
  if (!Number.isFinite(distanceMeters) || distanceMeters == null) return undefined;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

export function formatGooglePriceRange(priceRange?: GooglePriceRange): string | undefined {
  const start = formatGoogleMoney(priceRange?.startPrice);
  const end = formatGoogleMoney(priceRange?.endPrice);

  if (start && end) return `${start}~${end}`;
  if (start) return `${start} 이상`;
  if (end) return `${end} 이하`;
  return undefined;
}

export function estimateCostFromPlaceData(
  type: PlaceRecommendationType,
  priceLevel?: string,
  priceRange?: GooglePriceRange,
  _estimatedCostKrw?: number,
): Pick<
  PlaceRecommendation,
  "costBasis" | "costConfidence" | "costDisplayText" | "costSource" | "estimatedCostKrw"
> {
  const priceRangeText = formatGooglePriceRange(priceRange);
  if (priceRangeText) {
    return {
      costBasis: "Google Places priceRange 필드 기준",
      costConfidence: "high",
      costDisplayText: priceRangeText,
      costSource: "google_places_price_range",
      estimatedCostKrw: 0,
    };
  }

  const normalizedPriceLevel = normalizePriceLevel(priceLevel);

  if (normalizedPriceLevel) {
    return {
      costBasis: `Google Places priceLevel(${toKoreanPriceLevel(normalizedPriceLevel)}) 기준. 실제 금액은 Google에서 제공되지 않음`,
      costConfidence: "medium",
      costDisplayText: `Google 가격대: ${toKoreanPriceLevel(normalizedPriceLevel)}`,
      costSource: "google_places_price_level",
      estimatedCostKrw: 0,
    };
  }

  return {
    costBasis: `Google Places 응답에 priceRange/priceLevel 값이 없음. 장소 유형(${toKoreanPlaceType(type)})만 확인됨`,
    costConfidence: "none",
    costDisplayText: "Google Places 가격 필드 미제공",
    costSource: "google_places_price_unavailable",
    estimatedCostKrw: 0,
  };
}

export function recommendDurationFromPlaceData(
  type: PlaceRecommendationType,
  primaryType?: string,
): Pick<PlaceRecommendation, "durationMinutes" | "durationBasis" | "durationSource"> {
  const normalizedPrimaryType = primaryType?.toLowerCase() ?? "";

  if (normalizedPrimaryType.includes("market") || normalizedPrimaryType.includes("shopping")) {
    return {
      durationMinutes: 90,
      durationBasis: "Google Places 장소 유형이 마켓/쇼핑 계열이라 둘러보기 기준 90분 적용",
      durationSource: "place_type_rule",
    };
  }

  if (normalizedPrimaryType.includes("museum") || normalizedPrimaryType.includes("tourist")) {
    return {
      durationMinutes: 90,
      durationBasis: "Google Places 장소 유형이 관광지 계열이라 관람 기준 90분 적용",
      durationSource: "place_type_rule",
    };
  }

  const baseline: Record<PlaceRecommendationType, number> = {
    cafe: 45,
    restaurant: 75,
    tourist_spot: 90,
    other: 60,
  };

  return {
    durationMinutes: baseline[type],
    durationBasis: `장소 유형(${toKoreanPlaceType(type)})별 권장 체류시간 기준 적용`,
    durationSource: "place_type_rule",
  };
}

export async function enrichLocalItinerary(
  itinerary: LocalItineraryResult,
  context: ItineraryContext,
  options: {
    googleApiKey?: string;
    fetcher?: Fetcher;
  } = {},
): Promise<LocalItineraryResult> {
  const fetcher = options.fetcher ?? fetch;

  if (!options.googleApiKey) {
    return markAsGoogleUnavailable(itinerary, "GOOGLE_PLACES_API_KEY 없음. Google Places/Routes 기반 검증 없이 추천 장소명만 표시합니다.");
  }

  const notices = new Set(itinerary.dataQualityNotices ?? []);
  let previousOrigin = context.accommodationLocation
    ? await resolveOriginFromAddress(context.accommodationLocation, options.googleApiKey, fetcher)
    : null;

  if (context.accommodationLocation && !previousOrigin) {
    notices.add("숙소 위치를 Google Places에서 확인하지 못해 첫 장소 이동시간을 표시하지 않았습니다.");
  }

  const enrichedBlocks = [];

  for (const block of itinerary.itinerary) {
    const enrichedPlaces: PlaceRecommendation[] = [];

    for (const place of block.places) {
      const googlePlace = await searchGooglePlace(place, context, options.googleApiKey, fetcher);
      const nextPlace = applyPlaceData(place, googlePlace);
      const hadPreviousOrigin = Boolean(previousOrigin);
      const route = previousOrigin
        ? await computeEnrichmentRoute(previousOrigin, nextPlace, options.googleApiKey, fetcher)
        : null;

      enrichedPlaces.push(applyRouteData(nextPlace, route));
      previousOrigin = createRouteOrigin(nextPlace);

      if (!googlePlace) {
        notices.add(`${place.name}: Google Places에서 일치 장소를 확인하지 못해 Google 기반 장소 정보를 표시하지 않았습니다.`);
      } else {
        if (!googlePlace.priceRange && !normalizePriceLevel(googlePlace.priceLevel)) {
          notices.add(`${place.name}: Google Places 응답에 priceRange/priceLevel 값이 없어 공식 사이트 또는 Google Maps에서 가격 확인이 필요합니다.`);
        }
        if (!route && hadPreviousOrigin) {
          notices.add(`${place.name}: Google Routes 이동시간을 확인하지 못해 이동시간을 표시하지 않았습니다.`);
        }
      }
    }

    enrichedBlocks.push({ ...block, places: enrichedPlaces });
  }

  const totalEstimatedCostKrw = enrichedBlocks
    .flatMap((block) => block.places)
    .reduce((sum, place) => sum + place.estimatedCostKrw, 0);

  return {
    ...itinerary,
    totalEstimatedCostKrw,
    itinerary: enrichedBlocks,
    dataQualityNotices: [...notices],
    totalCostBasisText: createTotalCostBasisText(enrichedBlocks.flatMap((block) => block.places)),
  };
}

async function resolveOriginFromAddress(
  address: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<{ address?: string; location?: LatLng } | null> {
  const place = await fetchGooglePlace(address, apiKey, fetcher);
  if (!place) return { address };

  return {
    address: place.formattedAddress ?? address,
    location: place.location,
  };
}

async function searchGooglePlace(
  place: PlaceRecommendation,
  context: ItineraryContext,
  apiKey: string,
  fetcher: Fetcher,
): Promise<GooglePlace | null> {
  if (place.googlePlaceId) {
    const placeById = await fetchGooglePlaceById(place.googlePlaceId, apiKey, fetcher);
    if (placeById) return placeById;
  }

  const queries = createGooglePlaceSearchQueries(place, context);

  for (const query of queries) {
    const googlePlace = await fetchGooglePlace(query, apiKey, fetcher);
    if (googlePlace) return googlePlace;
  }

  return null;
}

function createGooglePlaceSearchQueries(place: PlaceRecommendation, context: ItineraryContext): string[] {
  const queryParts = [
    [place.name, context.city, context.country],
    [place.name, place.address],
    [place.name, place.address, context.city, context.country],
    [place.address, context.city, context.country],
    [place.name],
  ];

  return [...new Set(queryParts.map((parts) => parts.filter(Boolean).join(" ").trim()).filter(Boolean))];
}

async function fetchGooglePlace(
  textQuery: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<GooglePlace | null> {
  try {
    const response = await fetcher(PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        languageCode: "ko",
        maxResultCount: 3,
        textQuery,
      }),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { places?: GooglePlace[] };
    return selectConcreteGooglePlace(payload.places);
  } catch {
    return null;
  }
}

async function fetchGooglePlaceById(
  placeId: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<GooglePlace | null> {
  const normalizedPlaceId = placeId.replace(/^places\//, "").trim();
  if (!normalizedPlaceId) return null;

  try {
    const response = await fetcher(`${PLACES_TEXT_SEARCH_URL.replace(":searchText", "")}/${encodeURIComponent(normalizedPlaceId)}`, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
      },
    });

    if (!response.ok) return null;
    const place = (await response.json()) as GooglePlace;
    return isConcreteGooglePlace(place) ? place : null;
  } catch {
    return null;
  }
}

function selectConcreteGooglePlace(places?: GooglePlace[]): GooglePlace | null {
  return places?.find(isConcreteGooglePlace) ?? null;
}

function isConcreteGooglePlace(place?: GooglePlace): place is GooglePlace {
  if (!place) return false;

  const types = place.types ?? [];
  const hasNonConcreteType = types.some((type) => NON_CONCRETE_PLACE_TYPES.has(type));
  if (hasNonConcreteType) return false;

  return Boolean(
    place.primaryType ||
      types.includes("establishment") ||
      types.includes("point_of_interest") ||
      place.googleMapsUri,
  );
}

async function computeEnrichmentRoute(
  origin: { address?: string; location?: LatLng } | null,
  destination: PlaceRecommendation,
  apiKey: string,
  fetcher: Fetcher,
  travelMode: string = "WALK",
): Promise<RouteSummary | null> {
  if (!origin) return null;

  const originWaypoint = createWaypoint(origin);
  const destinationWaypoint = createWaypoint({
    address: destination.address,
    location: destination.location,
  });

  if (!originWaypoint || !destinationWaypoint) return null;

  try {
    const response = await fetcher(ROUTES_COMPUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
      },
      body: JSON.stringify({
        destination: destinationWaypoint,
        origin: originWaypoint,
        travelMode,
      }),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as {
      routes?: Array<{ distanceMeters?: number; duration?: string }>;
    };
    const route = payload.routes?.[0];
    if (!route) return null;

    return {
      distanceMeters: route.distanceMeters,
      durationMinutes: parseGoogleDurationToMinutes(route.duration),
    };
  } catch {
    return null;
  }
}

function applyPlaceData(place: PlaceRecommendation, googlePlace: GooglePlace | null): PlaceRecommendation {
  if (!googlePlace) {
    return {
      ...place,
      costBasis: "Google Places 일치 장소 없음. 비용 판단 불가",
      costConfidence: "none",
      costDisplayText: "Google Places 장소 미확인",
      costSource: "google_unavailable",
      durationBasis: "Google Places 일치 장소 없음. 체류시간 판단 불가",
      durationSource: "google_unavailable",
      durationMinutes: 0,
      estimatedCostKrw: place.estimatedCostKrw ?? 0,
      placeDataSource: "google_unavailable",
    };
  }

  const type = inferPlaceType(place.type, googlePlace.primaryType);
  const cost = estimateCostFromPlaceData(type, googlePlace.priceLevel, googlePlace.priceRange, place.estimatedCostKrw);
  const duration = recommendDurationFromPlaceData(type, googlePlace.primaryType);

  return {
    ...place,
    ...cost,
    ...duration,
    name: googlePlace.displayName?.text ?? place.name,
    address: googlePlace.formattedAddress ?? place.address,
    googleMapsUri: googlePlace.googleMapsUri ?? place.googleMapsUri,
    googlePlaceId: googlePlace.id ?? place.googlePlaceId,
    websiteUri: googlePlace.websiteUri ?? place.websiteUri,
    location: googlePlace.location ?? place.location,
    openingHoursText: summarizeOpeningHours(googlePlace),
    placeDataSource: "google_places",
    priceLevel: googlePlace.priceLevel ?? place.priceLevel,
    priceRangeText: formatGooglePriceRange(googlePlace.priceRange),
    primaryType: googlePlace.primaryType ?? place.primaryType,
    primaryTypeDisplayName: googlePlace.primaryTypeDisplayName?.text ?? place.primaryTypeDisplayName,
    rating: googlePlace.rating ?? place.rating,
    reviewSummary: summarizeReviews(googlePlace),
    userRatingCount: googlePlace.userRatingCount ?? place.userRatingCount,
  };
}

function applyRouteData(place: PlaceRecommendation, route: RouteSummary | null, travelModeLabel = "도보"): PlaceRecommendation {
  if (!route?.durationMinutes) {
    return {
      ...place,
      travelTimeBasis: "Google Routes 이동경로 확인 실패. 이동시간 판단 불가",
      travelTimeFromPreviousMinutes: undefined,
      travelTimeSource: "google_unavailable",
    };
  }

  const distanceText = formatDistanceMeters(route.distanceMeters);

  return {
    ...place,
    distanceMetersFromPrevious: route.distanceMeters,
    travelMode: travelModeLabel,
    travelTimeBasis: distanceText
      ? `Google Routes ${travelModeLabel} 경로 ${distanceText} 기준`
      : `Google Routes ${travelModeLabel} 경로 기준`,
    travelTimeFromPreviousMinutes: route.durationMinutes,
    travelTimeSource: "google_routes",
  };
}

function createRouteOrigin(place: PlaceRecommendation): { address?: string; location?: LatLng } | null {
  if (place.location) return { address: place.address, location: place.location };
  if (place.address) return { address: place.address };
  return null;
}

function createWaypoint(target: { address?: string; location?: LatLng } | null) {
  if (!target) return null;
  if (target.location) {
    return {
      location: {
        latLng: {
          latitude: target.location.latitude,
          longitude: target.location.longitude,
        },
      },
    };
  }

  if (target.address) {
    return { address: target.address };
  }

  return null;
}

function createTotalCostBasisText(places: PlaceRecommendation[]): string {
  const priceRangeCount = places.filter((place) => place.costSource === "google_places_price_range").length;
  const priceLevelCount = places.filter((place) => place.costSource === "google_places_price_level").length;
  const priceUnavailableCount = places.filter((place) => place.costSource === "google_places_price_unavailable").length;
  const googleUnavailableCount = places.filter((place) => place.costSource === "google_unavailable").length;

  if (priceRangeCount > 0) {
    return `${priceRangeCount}개 장소는 Google 가격 범위, ${priceLevelCount}개 장소는 Google 가격대 기준`;
  }

  if (priceLevelCount > 0) {
    return `${priceLevelCount}개 장소는 Google 가격대만 확인됨. 총액은 확정하지 않음`;
  }

  if (priceUnavailableCount > 0) {
    return `${priceUnavailableCount}개 장소는 Google Places 가격 필드 미제공. 공식 사이트 또는 Google Maps 확인 필요`;
  }

  if (googleUnavailableCount > 0) {
    return "Google Places 일치 장소 미확인. 공식 사이트 또는 Google Maps 확인 필요";
  }

  return "Google Places 가격 필드 미확인";
}

function markAsGoogleUnavailable(itinerary: LocalItineraryResult, notice: string): LocalItineraryResult {
  return {
    ...itinerary,
    dataQualityNotices: [...(itinerary.dataQualityNotices ?? []), notice],
    totalCostBasisText: "GOOGLE_PLACES_API_KEY 없음. AI 예상 비용 사용 (Google 검증 불가)",
    itinerary: itinerary.itinerary.map((block) => ({
      ...block,
      places: block.places.map((place) => ({
        ...place,
        costBasis: place.estimatedCostKrw && place.estimatedCostKrw > 0 ? "AI가 예상한 실제 비용 기준" : "GOOGLE_PLACES_API_KEY 없음. 비용 판단 불가",
        costConfidence: place.estimatedCostKrw && place.estimatedCostKrw > 0 ? "medium" : "none",
        costDisplayText: place.estimatedCostKrw && place.estimatedCostKrw > 0 ? `약 ${place.estimatedCostKrw.toLocaleString()}원` : "Google API 미호출",
        costSource: "google_unavailable",
        durationBasis: "Google Places 장소 유형 미확인. 체류시간 판단 불가",
        durationMinutes: 0,
        durationSource: "google_unavailable",
        estimatedCostKrw: place.estimatedCostKrw ?? 0,
        placeDataSource: "google_unavailable",
        travelTimeBasis: "Google Routes 이동시간 없음. 이동시간 판단 불가",
        travelTimeFromPreviousMinutes: undefined,
        travelTimeSource: "google_unavailable",
      })),
    })),
  };
}

function inferPlaceType(type: PlaceRecommendationType, primaryType?: string): PlaceRecommendationType {
  const normalizedPrimaryType = primaryType?.toLowerCase() ?? "";
  if (normalizedPrimaryType.includes("cafe") || normalizedPrimaryType.includes("coffee")) return "cafe";
  if (normalizedPrimaryType.includes("restaurant") || normalizedPrimaryType.includes("food")) return "restaurant";
  if (normalizedPrimaryType.includes("tourist") || normalizedPrimaryType.includes("museum")) return "tourist_spot";
  return type;
}

function normalizePriceLevel(priceLevel?: string): string | null {
  if (!priceLevel || priceLevel === "PRICE_LEVEL_UNSPECIFIED") return null;
  if (
    priceLevel === "PRICE_LEVEL_FREE" ||
    priceLevel === "PRICE_LEVEL_INEXPENSIVE" ||
    priceLevel === "PRICE_LEVEL_MODERATE" ||
    priceLevel === "PRICE_LEVEL_EXPENSIVE" ||
    priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE"
  ) {
    return priceLevel;
  }
  return null;
}

function summarizeOpeningHours(place: GooglePlace): string | undefined {
  if (typeof place.regularOpeningHours?.openNow === "boolean") {
    return place.regularOpeningHours.openNow ? "현재 영업 중" : "현재 영업시간 외";
  }

  return place.regularOpeningHours?.weekdayDescriptions?.[0];
}

function summarizeReviews(place: GooglePlace): string | undefined {
  const reviewText = place.reviews
    ?.map((review) => review.text?.text)
    .find((text): text is string => Boolean(text?.trim()));
  const countText = place.userRatingCount ? `리뷰 ${place.userRatingCount.toLocaleString()}개` : "";
  const ratingText = place.rating ? `평점 ${place.rating}` : "";

  if (reviewText) {
    const shortReview = reviewText.length > 90 ? `${reviewText.slice(0, 90)}...` : reviewText;
    return [ratingText, countText, shortReview].filter(Boolean).join(" · ");
  }

  return [ratingText, countText].filter(Boolean).join(" · ") || undefined;
}

function formatGoogleMoney(money?: GoogleMoney): string | undefined {
  if (!money?.currencyCode) return undefined;

  const units = Number(money.units ?? 0);
  const nanos = Number(money.nanos ?? 0);
  const value = units + nanos / 1_000_000_000;

  if (!Number.isFinite(value)) return undefined;

  return new Intl.NumberFormat("ko-KR", {
    currency: money.currencyCode,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
    style: "currency",
  }).format(value);
}

function toKoreanPriceLevel(priceLevel: string): string {
  const labels: Record<string, string> = {
    PRICE_LEVEL_FREE: "무료",
    PRICE_LEVEL_INEXPENSIVE: "저렴",
    PRICE_LEVEL_MODERATE: "보통",
    PRICE_LEVEL_EXPENSIVE: "비쌈",
    PRICE_LEVEL_VERY_EXPENSIVE: "매우 비쌈",
  };

  return labels[priceLevel] ?? priceLevel;
}

function toKoreanPlaceType(type: PlaceRecommendationType): string {
  const labels: Record<PlaceRecommendationType, string> = {
    cafe: "카페",
    restaurant: "식당",
    tourist_spot: "관광지",
    other: "기타",
  };

  return labels[type];
}
