import { describe, expect, it } from "vitest";

import {
  buildGooglePlaceSearchIntents,
  DAILY_ITINERARY_CATEGORY_TARGETS,
  FAR_PLACE_POLICY,
  getFarPlacePolicyForTravelModes,
  getItineraryCompositionPolicy,
  getRecommendationCategoryGroup,
  isFarPlace,
  isLodgingType,
  localItineraryRecommendationRequestSchema,
  RECOMMENDATION_SCORE_WEIGHTS,
  SEARCH_RADIUS_POLICY_METERS,
  selectTargetPlaceCount,
} from "./recommendation-policy";

describe("itinerary recommendation policy", () => {
  it("defines explainable search radius and scoring policies", () => {
    expect(SEARCH_RADIUS_POLICY_METERS).toEqual({
      defaultWalkable: 3000,
      expandedWalkable: 5000,
      urbanHardCap: 8000,
      transitAssistedMax: 15000,
    });

    const totalWeight = Object.values(RECOMMENDATION_SCORE_WEIGHTS).reduce(
      (sum, weight) => sum + weight,
      0,
    );

    expect(totalWeight).toBe(100);
    expect(RECOMMENDATION_SCORE_WEIGHTS).toMatchObject({
      routeEfficiency: 30,
      googlePopularity: 40,
      openingHoursFit: 15,
      budgetFit: 10,
      categoryDiversity: 5,
    });
  });

  it("defines daily category balance targets and normalizes Google place types", () => {
    expect(DAILY_ITINERARY_CATEGORY_TARGETS.meal).toEqual({ min: 1, max: 3 });
    expect(DAILY_ITINERARY_CATEGORY_TARGETS.attraction).toEqual({ min: 2, max: 4 });
    expect(DAILY_ITINERARY_CATEGORY_TARGETS.cafe).toEqual({ min: 1, max: 2 });
    expect(DAILY_ITINERARY_CATEGORY_TARGETS.shoppingOrExperience).toEqual({
      min: 0,
      max: 2,
    });

    expect(getRecommendationCategoryGroup({ preferenceKind: "food", primaryType: "restaurant" }))
      .toBe("meal");
    expect(getRecommendationCategoryGroup({ preferenceKind: "food", primaryType: "cafe" }))
      .toBe("cafe");
    expect(getRecommendationCategoryGroup({ preferenceKind: "place", primaryType: "museum" }))
      .toBe("attraction");
    expect(
      getRecommendationCategoryGroup({
        preferenceKind: "place",
        primaryType: "tourist_attraction",
      }),
    ).toBe("attraction");
    expect(
      getRecommendationCategoryGroup({ preferenceKind: "place", primaryType: "market" })
    ).toBe("shoppingOrExperience");
    expect(
      getRecommendationCategoryGroup({
        name: "Canal City Hakata",
        preferenceKind: "food",
        primaryType: "shopping_mall",
      }),
    ).toBe("shoppingOrExperience");
  });

  it("scales target place count with the selected itinerary duration", () => {
    expect(selectTargetPlaceCount(240)).toBe(3);
    expect(selectTargetPlaceCount(480)).toBe(5);
    expect(selectTargetPlaceCount(720)).toBe(7);
    expect(selectTargetPlaceCount({ durationMinutes: 480, targetPlaceCount: 3 })).toBe(3);
    expect(selectTargetPlaceCount({ durationMinutes: 480, targetPlaceCount: 5 })).toBe(5);
    expect(selectTargetPlaceCount({ durationMinutes: 480, targetPlaceCount: 7 })).toBe(7);
  });

  it("defines explicit intensity composition rules for meals and snacks", () => {
    expect(getItineraryCompositionPolicy({ targetPlaceCount: 3 })).toEqual({
      mealCount: 1,
      nonFoodCount: 2,
      snackCount: 0,
      targetPlaceCount: 3,
    });
    expect(getItineraryCompositionPolicy({ targetPlaceCount: 5 })).toEqual({
      mealCount: 1,
      nonFoodCount: 3,
      snackCount: 1,
      targetPlaceCount: 5,
    });
    expect(getItineraryCompositionPolicy({ targetPlaceCount: 7 })).toEqual({
      mealCount: 2,
      nonFoodCount: 4,
      snackCount: 1,
      targetPlaceCount: 7,
    });
    expect(getItineraryCompositionPolicy({ includeMeals: false, targetPlaceCount: 7 })).toEqual({
      mealCount: 0,
      nonFoodCount: 7,
      snackCount: 0,
      targetPlaceCount: 7,
    });
  });

  it("identifies lodging and accommodation types", () => {
    expect(isLodgingType("hotel")).toBe(true);
    expect(isLodgingType("lodging")).toBe(true);
    expect(isLodgingType("guest_house")).toBe(true);
    expect(isLodgingType("resort_hotel")).toBe(true);
    expect(isLodgingType("restaurant")).toBe(false);
    expect(isLodgingType("museum")).toBe(false);
    expect(isLodgingType(undefined)).toBe(false);
  });

  describe("getRecommendationCategoryGroup — 숙박시설 분류", () => {
    it.each(["hotel", "motel", "hostel", "lodging", "resort_hotel", "inn", "bed_and_breakfast"])(
      '"%s" primaryType은 "other"로 분류된다',
      (primaryType) => {
        expect(getRecommendationCategoryGroup({ primaryType })).toBe("other");
      },
    );
    it("숙박시설이 attraction으로 잘못 분류되지 않는다", () => {
      expect(getRecommendationCategoryGroup({ primaryType: "hotel", preferenceKind: "place" })).not.toBe("attraction");
    });
  });

  it("maps selected food and place preferences to Google place search intents", () => {
    const intents = buildGooglePlaceSearchIntents({
      foodThemes: ["현지 로컬 맛집", "트렌디한 카페/디저트"],
      vibeThemes: ["자연 속 휴식 (공원/바다)", "문화 / 예술 / 박물관"],
    });

    expect(intents).toEqual([
      {
        defaultRadiusMeters: 3000,
        expandedRadiusMeters: 5000,
        includedTypes: ["restaurant"],
        maxRadiusMeters: 8000,
        preferenceKind: "food",
        rankPreference: "POPULARITY",
        searchQueries: ["local restaurant", "regional food"],
        sourceTheme: "현지 로컬 맛집",
      },
      {
        defaultRadiusMeters: 3000,
        expandedRadiusMeters: 5000,
        includedTypes: ["cafe", "bakery"],
        maxRadiusMeters: 8000,
        preferenceKind: "food",
        rankPreference: "POPULARITY",
        searchQueries: ["cafe dessert"],
        sourceTheme: "트렌디한 카페/디저트",
      },
      {
        defaultRadiusMeters: 3000,
        expandedRadiusMeters: 5000,
        includedTypes: ["park", "tourist_attraction"],
        maxRadiusMeters: 8000,
        preferenceKind: "place",
        rankPreference: "DISTANCE",
        searchQueries: ["park waterfront"],
        sourceTheme: "자연 속 휴식 (공원/바다)",
      },
      {
        defaultRadiusMeters: 3000,
        expandedRadiusMeters: 5000,
        includedTypes: ["museum", "art_gallery"],
        maxRadiusMeters: 8000,
        preferenceKind: "place",
        rankPreference: "POPULARITY",
        searchQueries: ["museum art gallery"],
        sourceTheme: "문화 / 예술 / 박물관",
      },
    ]);
  });

  it("validates the shared Google-first itinerary request contract", () => {
    const request = localItineraryRecommendationRequestSchema.parse({
      budget: "보통",
      city: "Fukuoka",
      country: "JP",
      departure: {
        address: "5-chome-21-5 Watanabedori, Chuo Ward, Fukuoka",
        lat: 33.5868,
        lng: 130.4017,
      },
      durationMinutes: 480,
      startTime: "09:00",
    });

    // WALK+TRANSIT 기본 요청 → getRadiusPolicyForTravelModes 결과: TRANSIT의 default(8000)
    expect(request.searchRadiusMeters).toBe(8000);
    expect(request.sortMode).toBe("route_optimized");
    expect(request.departure.lat).toBe(33.5868);
  });

  it("rejects itinerary requests without a usable departure basis", () => {
    const result = localItineraryRecommendationRequestSchema.safeParse({
      country: "JP",
      departure: {},
      durationMinutes: 480,
      startTime: "09:00",
    });

    expect(result.success).toBe(false);
  });

  describe("far place policy", () => {
    it("defines per-mode far place thresholds with max 1 per day", () => {
      expect(FAR_PLACE_POLICY.WALK.farThresholdMeters).toBe(5000);
      expect(FAR_PLACE_POLICY.TRANSIT.farThresholdMeters).toBe(15000);
      expect(FAR_PLACE_POLICY.DRIVE.farThresholdMeters).toBe(20000);
      expect(FAR_PLACE_POLICY.BICYCLE.farThresholdMeters).toBe(8000);
      expect(FAR_PLACE_POLICY.WALK.maxPerDay).toBe(1);
      expect(FAR_PLACE_POLICY.TRANSIT.maxPerDay).toBe(1);
    });

    it("returns the most generous policy when multiple travel modes are given", () => {
      const policy = getFarPlacePolicyForTravelModes(["WALK", "TRANSIT"]);
      expect(policy.farThresholdMeters).toBe(15000);

      const drivePolicy = getFarPlacePolicyForTravelModes(["WALK", "DRIVE"]);
      expect(drivePolicy.farThresholdMeters).toBe(20000);
    });

    it("falls back to WALK policy when no modes are given", () => {
      expect(getFarPlacePolicyForTravelModes([]).farThresholdMeters).toBe(5000);
      expect(getFarPlacePolicyForTravelModes(undefined).farThresholdMeters).toBe(5000);
    });

    it("correctly classifies places as far or near", () => {
      expect(isFarPlace(4000, ["WALK"])).toBe(false);
      expect(isFarPlace(6000, ["WALK"])).toBe(true);
      expect(isFarPlace(14000, ["TRANSIT"])).toBe(false);
      expect(isFarPlace(16000, ["TRANSIT"])).toBe(true);
      expect(isFarPlace(12000, ["WALK", "TRANSIT"])).toBe(false);
      expect(isFarPlace(16000, ["WALK", "TRANSIT"])).toBe(true);
    });
  });
});
