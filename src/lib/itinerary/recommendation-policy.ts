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

/** 이동수단별 검색 반경 정책 (미터 단위)
 *  - default: 스코어링 기준 거리 (이 범위 내 장소가 높은 routeEfficiency 점수)
 *  - expanded: 확장 검색 시 사용
 *  - hardCap: Google Places 후보 수집용 최대 반경 (넓게 유지)
 */
export const TRAVEL_MODE_RADIUS_POLICY: Record<TravelMode, RadiusPolicy> = {
  BICYCLE: { default: 5000, expanded: 8000, hardCap: 15000, label: "Bicycle" },
  DRIVE: { default: 10000, expanded: 20000, hardCap: 50000, label: "Drive" },
  TRANSIT: { default: 8000, expanded: 15000, hardCap: 50000, label: "Transit" },
  WALK: { default: 3000, expanded: 5000, hardCap: 8000, label: "Walk" },
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

/** 먼 장소(Far Place) 판정 및 일일 제한 정책 */
export interface FarPlacePolicy {
  /** 이 거리(미터) 초과 시 '먼 장소'로 분류 */
  farThresholdMeters: number;
  /** 하루 일정에 포함 가능한 먼 장소 최대 수 */
  maxPerDay: number;
}

/** 이동수단별 먼 장소 기준 */
export const FAR_PLACE_POLICY: Record<TravelMode, FarPlacePolicy> = {
  BICYCLE: { farThresholdMeters: 8000, maxPerDay: 1 },
  DRIVE: { farThresholdMeters: 20000, maxPerDay: 1 },
  TRANSIT: { farThresholdMeters: 15000, maxPerDay: 1 },
  WALK: { farThresholdMeters: 5000, maxPerDay: 1 },
};

/** 여러 이동수단 중 가장 관대한(가장 큰 threshold) 먼 장소 정책 반환 */
export const getFarPlacePolicyForTravelModes = (modes?: TravelMode[]): FarPlacePolicy => {
  if (!modes || modes.length === 0) return FAR_PLACE_POLICY["WALK"];

  const sortedPolicies = modes
    .map((mode) => FAR_PLACE_POLICY[mode])
    .sort((a, b) => b.farThresholdMeters - a.farThresholdMeters);

  return sortedPolicies[0];
};

/** 숙소로부터의 거리가 먼 장소 기준을 초과하는지 판정 */
export const isFarPlace = (
  distanceMeters: number,
  travelModes: TravelMode[],
): boolean => {
  return distanceMeters > getFarPlacePolicyForTravelModes(travelModes).farThresholdMeters;
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
  { label: "여유롭게", targetPlaceCount: 3, value: "relaxed" },
  { label: "보통", targetPlaceCount: 5, value: "normal" },
  { label: "알차게", targetPlaceCount: 7, value: "tight" },
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

export interface ItineraryCompositionPolicy {
  mealCount: number;
  nonFoodCount: number;
  snackCount: number;
  targetPlaceCount: number;
}

export const getItineraryCompositionPolicy = (
  input:
    | number
    | { durationMinutes?: number; includeMeals?: boolean; targetPlaceCount?: number },
): ItineraryCompositionPolicy => {
  const targetPlaceCount = selectTargetPlaceCount(input);
  const includeMeals = typeof input === "number" ? true : input.includeMeals !== false;

  if (!includeMeals) {
    return {
      mealCount: 0,
      nonFoodCount: targetPlaceCount,
      snackCount: 0,
      targetPlaceCount,
    };
  }

  const foodCounts =
    targetPlaceCount <= 3
      ? { mealCount: 1, snackCount: 0 }
      : targetPlaceCount <= 5
        ? { mealCount: 1, snackCount: 1 }
        : { mealCount: 2, snackCount: 1 };

  return {
    ...foodCounts,
    nonFoodCount: targetPlaceCount - foodCounts.mealCount - foodCounts.snackCount,
    targetPlaceCount,
  };
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
    normalizedName.includes("시장") ||
    normalizedName.includes("market") ||
    normalizedName.includes("야시장") ||
    normalizedName.includes("거리") ||
    normalizedName.includes("street") ||
    normalizedName.includes("푸드코트") ||
    matchesPlaceType(normalizedType, ["food_court", "food_truck"]);
  const isShoppingComplex =
    normalizedName.includes("canal city") ||
    normalizedName.includes("mall") ||
    normalizedName.includes("shopping") ||
    normalizedName.includes("department store") ||
    normalizedName.includes("plaza") ||
    matchesPlaceType(normalizedType, ["shopping_mall"]);

  if (isMarketOrStreet || isShoppingComplex) {
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
  default_cafe: {
    includedTypes: ["cafe", "bakery"],
    rankPreference: "POPULARITY",
    searchQueries: ["cafe dessert"],
  },
  default_local_food: {
    includedTypes: ["restaurant"],
    rankPreference: "POPULARITY",
    searchQueries: ["local restaurant", "regional food"],
  },
  "간편한 길거리 음식 / 패스트푸드": {
    includedTypes: ["meal_takeaway", "fast_food_restaurant"],
    rankPreference: "DISTANCE",
    searchQueries: ["street food", "fast food"],
  },
  "로컬 펍 & 바 (야간 일정)": {
    includedTypes: ["bar", "pub"],
    rankPreference: "POPULARITY",
    searchQueries: ["local pub", "bar"],
  },
  "트렌디한 카페/디저트": {
    includedTypes: ["cafe", "bakery"],
    rankPreference: "POPULARITY",
    searchQueries: ["cafe dessert"],
  },
  "파인 다이닝 / 고급 레스토랑": {
    includedTypes: ["fine_dining_restaurant", "restaurant"],
    rankPreference: "POPULARITY",
    searchQueries: ["fine dining restaurant"],
  },
  "현지 로컬 맛집": {
    includedTypes: ["restaurant"],
    rankPreference: "POPULARITY",
    searchQueries: ["local restaurant", "regional food"],
  },
};

const placeSearchIntentByTheme: Record<string, SearchIntentTemplate> = {
  default_landmark: {
    includedTypes: ["tourist_attraction"],
    rankPreference: "POPULARITY",
    searchQueries: ["landmark attraction"],
  },
  "문화 / 예술 / 박물관": {
    includedTypes: ["museum", "art_gallery"],
    rankPreference: "POPULARITY",
    searchQueries: ["museum art gallery"],
  },
  "로컬 시장 & 대형 쇼핑몰": {
    includedTypes: ["market", "shopping_mall"],
    rankPreference: "POPULARITY",
    searchQueries: ["market shopping mall"],
  },
  "자연 속 휴식 (공원/바다)": {
    includedTypes: ["park", "tourist_attraction"],
    rankPreference: "DISTANCE",
    searchQueries: ["park waterfront"],
  },
  "필수 랜드마크 & 명소": {
    includedTypes: ["tourist_attraction"],
    rankPreference: "POPULARITY",
    searchQueries: ["landmark attraction"],
  },
  "핫플레이스 / 번화가 걷기": {
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

const defaultFoodThemes = ["default_local_food", "default_cafe"];
const defaultVibeThemes = ["default_landmark"];

export const buildGooglePlaceSearchIntents = ({
  foodThemes = [],
  vibeThemes = [],
  travelModes = ["WALK"],
}: {
  foodThemes?: string[];
  vibeThemes?: string[];
  travelModes?: TravelMode[];
} = {}): GooglePlaceSearchIntent[] => {
  const normalizedFoodThemes = uniqueThemes(foodThemes);
  const normalizedVibeThemes = uniqueThemes(vibeThemes);
  const effectiveFoodThemes =
    normalizedFoodThemes.length > 0 ? normalizedFoodThemes : defaultFoodThemes;
  const effectiveVibeThemes =
    normalizedVibeThemes.length > 0 ? normalizedVibeThemes : defaultVibeThemes;

  return [
    ...effectiveFoodThemes.map((theme) =>
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
    ...effectiveVibeThemes.map((theme) =>
      placeSearchIntentByTheme[theme]
        ? createIntent(theme, "place", placeSearchIntentByTheme[theme], travelModes)
        : createFallbackIntent(theme, "place", travelModes),
    ),
  ];
};

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
  foodThemes: z.array(z.string().trim()).default([]),
  includeMeals: z.boolean().default(true),
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
  vibeThemes: z.array(z.string().trim()).default([]),
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
