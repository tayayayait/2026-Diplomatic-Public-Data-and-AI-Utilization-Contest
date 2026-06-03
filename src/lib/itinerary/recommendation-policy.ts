import { z } from "zod";

/** Google Routes API媛 吏?먰븯???대룞?섎떒 */
export type TravelMode = "WALK" | "DRIVE" | "TRANSIT" | "BICYCLE";
export const travelModeSchema = z.enum(["WALK", "DRIVE", "TRANSIT", "BICYCLE"]);
export type ItineraryIntensity = "relaxed" | "normal" | "tight";
export const itineraryIntensitySchema = z.enum(["relaxed", "normal", "tight"]);

/** @deprecated ?섏쐞 ?명솚?? ??肄붾뱶??getRadiusPolicyForTravelMode()瑜??ъ슜?섏꽭?? */
export const SEARCH_RADIUS_POLICY_METERS = {
  defaultWalkable: 3000,
  expandedWalkable: 5000,
  urbanHardCap: 8000,
  transitAssistedMax: 15000,
} as const;

export interface RadiusPolicy {
  default: number;
  expanded: number;
  hardCap: number;
  label: string;
}

/** ?대룞?섎떒蹂?寃??諛섍꼍 ?뺤콉 (誘명꽣 ?⑥쐞) */
export const TRAVEL_MODE_RADIUS_POLICY: Record<TravelMode, RadiusPolicy> = {
  BICYCLE: { default: 50000, expanded: 50000, hardCap: 50000, label: "Bicycle" },
  DRIVE: { default: 50000, expanded: 50000, hardCap: 50000, label: "Drive" },
  TRANSIT: { default: 50000, expanded: 50000, hardCap: 50000, label: "Transit" },
  WALK: { default: 50000, expanded: 50000, hardCap: 50000, label: "Walk" },
} as const;

/** ?대룞?섎떒??留욌뒗 諛섍꼍 ?뺤콉??諛섑솚?쒕떎. ?????녿뒗 紐⑤뱶硫?WALK fallback. */
export const getRadiusPolicyForTravelMode = (mode?: TravelMode): RadiusPolicy => {
  return mode ? TRAVEL_MODE_RADIUS_POLICY[mode] : TRAVEL_MODE_RADIUS_POLICY["WALK"];
};

export const getRadiusPolicyForTravelModes = (modes?: TravelMode[]): RadiusPolicy => {
  if (!modes || modes.length === 0) return TRAVEL_MODE_RADIUS_POLICY["WALK"];
  
  // 媛??諛섍꼍?????섎떒??李얠븘??諛섑솚 (hardCap 湲곗? ?대┝李⑥닚 ?뺣젹 ??泥?踰덉㎏)
  const sortedPolicies = modes
    .map(mode => TRAVEL_MODE_RADIUS_POLICY[mode])
    .sort((a, b) => b.hardCap - a.hardCap);
    
  const maxPolicy = sortedPolicies[0];
  
  // ?쇰꺼??"?꾨낫, ?以묎탳?? ?뺥깭濡?議고빀"
  const combinedLabel = modes.map(mode => TRAVEL_MODE_RADIUS_POLICY[mode].label).join(", ");
  
  return {
    ...maxPolicy,
    label: combinedLabel,
  };
};

export const RECOMMENDATION_SCORE_WEIGHTS = {
  routeEfficiency: 30,
  googlePopularity: 40,
  openingHoursFit: 15,
  budgetFit: 10,
  categoryDiversity: 5,
} as const;

export type RecommendationPreferenceKind = "food" | "place";
export const DAILY_ITINERARY_CATEGORY_TARGETS = {
  meal: { min: 1, max: 3 },
  attraction: { min: 2, max: 4 },
  cafe: { min: 1, max: 2 },
  shoppingOrExperience: { min: 0, max: 2 },
  other: { min: 0, max: 5 },
} as const;

export const ITINERARY_INTENSITY_OPTIONS: Array<{
  label: string;
  targetPlaceCount: number;
  value: ItineraryIntensity;
}> = [
  { label: "Relaxed", targetPlaceCount: 3, value: "relaxed" },
  { label: "Normal", targetPlaceCount: 5, value: "normal" },
  { label: "Packed", targetPlaceCount: 7, value: "tight" },
];

const targetPlaceCountByIntensity: Record<ItineraryIntensity, number> = {
  relaxed: 3,
  normal: 5,
  tight: 7,
};

const softDurationMinutesByIntensity: Record<ItineraryIntensity, number> = {
  relaxed: 240,
  normal: 480,
  tight: 720,
};

const clampExplicitTargetPlaceCount = (value: number) =>
  Math.max(3, Math.min(7, Math.round(value)));

const clampDurationDerivedPlaceCount = (value: number) =>
  Math.max(1, Math.min(7, Math.round(value)));

const isItineraryIntensity = (value: unknown): value is ItineraryIntensity =>
  itineraryIntensitySchema.safeParse(value).success;

export const getTargetPlaceCountForIntensity = (intensity: ItineraryIntensity) =>
  targetPlaceCountByIntensity[intensity];

export const getSoftDurationMinutesForIntensity = (intensity: ItineraryIntensity) =>
  softDurationMinutesByIntensity[intensity];

export const normalizeItineraryIntensity = (
  value?: string,
  legacyDurationMinutes?: number,
): ItineraryIntensity => {
  if (isItineraryIntensity(value)) return value;
  if (typeof legacyDurationMinutes === "number" && Number.isFinite(legacyDurationMinutes)) {
    if (legacyDurationMinutes <= 300) return "relaxed";
    if (legacyDurationMinutes >= 600) return "tight";
  }

  return "normal";
};

export const selectTargetPlaceCount = (
  input: number | { durationMinutes?: number; targetPlaceCount?: number },
) => {
  if (typeof input === "number") {
    const normalizedDuration = Math.max(60, Math.min(720, input));

    return clampDurationDerivedPlaceCount(normalizedDuration / 90);
  }

  if (typeof input.targetPlaceCount === "number" && Number.isFinite(input.targetPlaceCount)) {
    return clampExplicitTargetPlaceCount(input.targetPlaceCount);
  }

  if (typeof input.durationMinutes === "number" && Number.isFinite(input.durationMinutes)) {
    return selectTargetPlaceCount(input.durationMinutes);
  }

  return targetPlaceCountByIntensity.normal;
};

export type RecommendationCategoryGroup = keyof typeof DAILY_ITINERARY_CATEGORY_TARGETS;
export type GooglePlacesRankPreference = "DISTANCE" | "POPULARITY";
export type ItinerarySortMode = "route_optimized" | "distance" | "popularity";

export const TRAVEL_MODE_OPTIONS: TravelMode[] = ["WALK", "TRANSIT", "DRIVE", "BICYCLE"];

const matchesPlaceType = (primaryType: string, placeTypes: string[]) =>
  placeTypes.some((placeType) => primaryType === placeType || primaryType.includes(placeType));

export const getRecommendationCategoryGroup = ({
  preferenceKind,
  primaryType,
  name,
}: {
  preferenceKind?: RecommendationPreferenceKind;
  primaryType?: string;
  name?: string;
}): RecommendationCategoryGroup => {
  const normalizedType = primaryType?.toLowerCase() ?? "";
  const normalizedName = name?.toLowerCase() ?? "";

  if (isLodgingType(normalizedType)) {
    return "other";
  }

  const isMarketOrStreet =
    normalizedName.includes("?쒖옣") ||
    normalizedName.includes("market") ||
    normalizedName.includes("?쇱떆??) ||"
    normalizedName.includes("嫄곕━") ||
    normalizedName.includes("street") ||
    normalizedName.includes("?몃뱶肄뷀듃") ||
    matchesPlaceType(normalizedType, ["food_court", "food_truck"]);

  if (isMarketOrStreet) {
    return "shoppingOrExperience";
  }

  if (matchesPlaceType(normalizedType, ["cafe", "coffee_shop", "bakery", "dessert"])) {
    return "cafe";
  }

  if (
    matchesPlaceType(normalizedType, [
      "restaurant",
      "meal_takeaway",
      "meal_delivery",
      "fast_food",
      "bar",
      "pub",
    ])
  ) {
    return "meal";
  }

  if (
    matchesPlaceType(normalizedType, [
      "market",
      "shopping_mall",
      "store",
      "souvenir",
      "amusement",
    ])
  ) {
    return "shoppingOrExperience";
  }

  if (
    matchesPlaceType(normalizedType, [
      "tourist_attraction",
      "museum",
      "art_gallery",
      "park",
      "landmark",
      "aquarium",
      "zoo",
      "garden",
      "temple",
      "shrine",
      "church",
    ])
  ) {
    return "attraction";
  }

  if (preferenceKind === "food") return "meal";
  if (preferenceKind === "place") return "attraction";

  return "other";
};

export const isLodgingType = (primaryType?: string): boolean => {
  const normalizedType = primaryType?.toLowerCase() ?? "";
  return matchesPlaceType(normalizedType, [
    "lodging",
    "hotel",
    "motel",
    "resort_hotel",
    "guest_house",
    "hostel",
    "campground",
    "rv_park",
    "bed_and_breakfast",
    "extended_stay_hotel",
    "private_guest_room",
  ]);
};

export interface GooglePlaceSearchIntent {
  defaultRadiusMeters: number;
  expandedRadiusMeters: number;
  includedTypes: string[];
  maxRadiusMeters: number;
  preferenceKind: RecommendationPreferenceKind;
  rankPreference: GooglePlacesRankPreference;
  searchQueries: string[];
  sourceTheme: string;
}

interface SearchIntentTemplate {
  includedTypes: string[];
  rankPreference: GooglePlacesRankPreference;
  searchQueries: string[];
}

const foodSearchIntentByTheme: Record<string, SearchIntentTemplate> = {
  "媛꾪렪??湲멸굅由??뚯떇 / ?⑥뒪?명뫖??: {"
    includedTypes: ["meal_takeaway", "fast_food_restaurant"],
    rankPreference: "DISTANCE",
    searchQueries: ["street food", "fast food"],
  },
  "濡쒖뺄 ??& 諛?(?쇨컙 ?쇱젙??": {
    includedTypes: ["bar", "pub"],
    rankPreference: "POPULARITY",
    searchQueries: ["local pub", "bar"],
  },
  "?몃젋?뷀븳 移댄럹/?붿???: {"
    includedTypes: ["cafe", "bakery"],
    rankPreference: "POPULARITY",
    searchQueries: ["cafe dessert"],
  },
  "?뚯씤 ?ㅼ씠??/ 怨좉툒 ?덉뒪?좊옉": {
    includedTypes: ["fine_dining_restaurant", "restaurant"],
    rankPreference: "POPULARITY",
    searchQueries: ["fine dining restaurant"],
  },
  "?꾩? 濡쒖뺄 留쏆쭛": {
    includedTypes: ["restaurant"],
    rankPreference: "POPULARITY",
    searchQueries: ["local restaurant", "regional food"],
  },
};

const placeSearchIntentByTheme: Record<string, SearchIntentTemplate> = {
  "臾명솕 / ?덉닠 / 諛뺣Ъ愿": {
    includedTypes: ["museum", "art_gallery"],
    rankPreference: "POPULARITY",
    searchQueries: ["museum art gallery"],
  },
  "濡쒖뺄 ?쒖옣 & ????쇳븨紐?: {"
    includedTypes: ["market", "shopping_mall"],
    rankPreference: "POPULARITY",
    searchQueries: ["market shopping mall"],
  },
  "?먯뿰 ???댁떇 (怨듭썝/諛붾떎)": {
    includedTypes: ["park", "tourist_attraction"],
    rankPreference: "DISTANCE",
    searchQueries: ["park waterfront"],
  },
  "?꾩닔 ?쒕뱶留덊겕 & 紐낆냼": {
    includedTypes: ["tourist_attraction"],
    rankPreference: "POPULARITY",
    searchQueries: ["landmark attraction"],
  },
  "?ロ뵆?덉씠??/ 踰덊솕媛 嫄룰린": {
    includedTypes: ["tourist_attraction", "shopping_mall"],
    rankPreference: "POPULARITY",
    searchQueries: ["popular district", "hot place"],
  },
};

const startTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const budgetPlanSchema = z.object({
  dailyBudgetKrw: z.number().optional(),
  dailyLocalBudget: z
    .object({
      accommodation: z.number(),
      activity: z.number(),
      food: z.number(),
      total: z.number(),
      transport: z.number(),
    })
    .optional(),
  exchangeRateKrwPerLocal: z.number().optional(),
  stayDays: z.number().optional(),
  strategy: z.enum(["saving", "balanced", "experience"]),
  targetCurrency: z.string().optional(),
  totalBudgetKrw: z.number().optional(),
});

const hasFiniteCoordinates = (departure: { lat?: number; lng?: number }) =>
  Number.isFinite(departure.lat) && Number.isFinite(departure.lng);

const hasDepartureBasis = (departure: { address?: string; lat?: number; lng?: number }) =>
  Boolean(departure.address?.trim()) || hasFiniteCoordinates(departure);

const createIntent = (
  sourceTheme: string,
  preferenceKind: RecommendationPreferenceKind,
  template: SearchIntentTemplate,
  travelModes: TravelMode[] = ["WALK"],
): GooglePlaceSearchIntent => {
  const policy = getRadiusPolicyForTravelModes(travelModes);
  return {
    defaultRadiusMeters: policy.default,
    expandedRadiusMeters: policy.expanded,
    includedTypes: [...template.includedTypes],
    maxRadiusMeters: policy.hardCap,
    preferenceKind,
    rankPreference: template.rankPreference,
    searchQueries: [...template.searchQueries],
    sourceTheme,
  };
};

const createFallbackIntent = (
  sourceTheme: string,
  preferenceKind: RecommendationPreferenceKind,
  travelModes: TravelMode[] = ["WALK"],
): GooglePlaceSearchIntent =>
  createIntent(
    sourceTheme,
    preferenceKind,
    {
      includedTypes: [],
      rankPreference: "POPULARITY",
      searchQueries: [sourceTheme],
    },
    travelModes,
  );

const uniqueThemes = (themes: string[]) => [
  ...new Set(themes.map((theme) => theme.trim()).filter(Boolean)),
];

export const buildGooglePlaceSearchIntents = ({
  foodThemes = [],
  vibeThemes = [],
  travelModes = ["WALK"],
}: {
  foodThemes?: string[];
  vibeThemes?: string[];
  travelModes?: TravelMode[];
} = {}): GooglePlaceSearchIntent[] => [
  ...uniqueThemes(foodThemes).map((theme) =>
    createIntent(
      theme,
      "food",
      foodSearchIntentByTheme[theme] ?? {
        includedTypes: [],
        rankPreference: "POPULARITY",
        searchQueries: [theme],
      },
      travelModes,
    ),
  ),
  ...uniqueThemes(vibeThemes).map((theme) =>
    placeSearchIntentByTheme[theme]
      ? createIntent(theme, "place", placeSearchIntentByTheme[theme], travelModes)
      : createFallbackIntent(theme, "place", travelModes),
  ),
];

const localItineraryRecommendationRequestBaseSchema = z.object({
  budget: z.string().trim().optional(),
  budgetPlan: budgetPlanSchema.optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().min(1),
  departure: z
    .object({
      address: z.string().trim().optional(),
      lat: z.number().finite().optional(),
      lng: z.number().finite().optional(),
    })
    .refine(hasDepartureBasis, "Departure address or finite coordinates are required."),
  durationMinutes: z.number().int().min(60).max(720).default(480),
  excludedGooglePlaceIds: z.array(z.string()).default([]),
  excludedPlaceNames: z.array(z.string()).default([]),
  searchRadiusMeters: z
    .number()
    .int()
    .min(500)
    .max(TRAVEL_MODE_RADIUS_POLICY.DRIVE.hardCap)
    .optional(),
  sortMode: z.enum(["route_optimized", "distance", "popularity"]).default("route_optimized"),
  startTime: z.string().regex(startTimePattern, "Invalid time format (HH:mm)"),
  targetPlaceCount: z.number().int().min(3).max(7).optional(),
  travelModes: z.array(travelModeSchema).min(1).default(["WALK", "TRANSIT"]),
});

export const localItineraryRecommendationRequestSchema =
  localItineraryRecommendationRequestBaseSchema.transform((request) => ({
    ...request,
    searchRadiusMeters:
      request.searchRadiusMeters ?? getRadiusPolicyForTravelModes(request.travelModes).default,
  }));

export type LocalItineraryRecommendationRequest = z.infer<
  typeof localItineraryRecommendationRequestSchema
>;
