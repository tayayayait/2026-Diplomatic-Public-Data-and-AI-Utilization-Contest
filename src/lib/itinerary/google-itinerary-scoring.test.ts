import { describe, expect, it } from "vitest";

import type { GooglePlaceCandidate } from "./google-place-candidates";
import type { LocalItineraryRecommendationRequest } from "./recommendation-policy";
import { selectGoogleFirstCandidates } from "./google-itinerary-scoring";

const baseRequest: LocalItineraryRecommendationRequest = {
  city: "Fukuoka",
  country: "JP",
  departure: { lat: 33.5868, lng: 130.4017 },
  durationMinutes: 480,
  excludedGooglePlaceIds: [],
  excludedPlaceNames: [],
  searchRadiusMeters: 3000,
  sortMode: "route_optimized",
  startTime: "09:00",
  travelModes: ["WALK"],
};

const candidate = (
  name: string,
  priceLevel: GooglePlaceCandidate["priceLevel"],
  overrides: Partial<GooglePlaceCandidate> = {},
): GooglePlaceCandidate => ({
  businessStatus: "OPERATIONAL",
  location: { lat: 33.587, lng: 130.402 },
  name,
  openingNow: true,
  preferenceKind: overrides.preferenceKind ?? "food",
  priceLevel,
  primaryType: overrides.primaryType ?? "restaurant",
  rating: 4.6,
  searchIntent: {
    defaultRadiusMeters: 3000,
    expandedRadiusMeters: 5000,
    includedTypes: [overrides.primaryType ?? "restaurant"],
    maxRadiusMeters: 8000,
    preferenceKind: overrides.preferenceKind ?? "food",
    rankPreference: "POPULARITY",
    searchQueries: ["local restaurant"],
    sourceTheme: "?꾩? 濡쒖뺄 留쏆쭛",
  },
  sourceTheme: "?꾩? 濡쒖뺄 留쏆쭛",
  userRatingCount: 900,
  ...overrides,
});

describe("Google itinerary budget scoring", () => {
  it("keeps famous expensive candidates available even for saving-first budget plans", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        budgetPlan: { dailyBudgetKrw: 50000, strategy: "saving", totalBudgetKrw: 300000 },
        durationMinutes: 60,
      },
      [
        candidate("Cheap Ramen", "PRICE_LEVEL_INEXPENSIVE", {
          rating: 4.0,
          userRatingCount: 100,
        }),
        candidate("Famous Restaurant", "PRICE_LEVEL_EXPENSIVE", {
          rating: 5.0,
          userRatingCount: 10000,
        }),
      ],
    );

    expect(selected.map((item) => item.name)).toEqual(["Famous Restaurant"]);
  });

  it("allows expensive candidates for experience-first budget plans", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        budgetPlan: { strategy: "experience", totalBudgetKrw: 800000 },
      },
      [
        candidate("Cheap Ramen", "PRICE_LEVEL_INEXPENSIVE"),
        candidate("Luxury Dinner", "PRICE_LEVEL_EXPENSIVE"),
      ],
    );

    expect(selected.map((item) => item.name)).toContain("Luxury Dinner");
  });

  it("uses a low daily budget as a price-fit signal without changing balanced strategy", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        budgetPlan: {
          dailyBudgetKrw: 50000,
          strategy: "balanced",
          totalBudgetKrw: 300000,
        },
        durationMinutes: 60,
      },
      [
        candidate("Cheap Ramen", "PRICE_LEVEL_INEXPENSIVE", {
          rating: 4.0,
          userRatingCount: 100,
        }),
        candidate("Luxury Dinner", "PRICE_LEVEL_EXPENSIVE", {
          rating: 5.0,
          userRatingCount: 10000,
        }),
      ],
    );

    expect(selected.map((item) => item.name)).toEqual(["Luxury Dinner"]);
  });

  it("prioritizes premium candidates for experience-first budgets", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        budgetPlan: {
          dailyBudgetKrw: 300000,
          strategy: "experience",
          totalBudgetKrw: 1800000,
        },
        durationMinutes: 60,
      },
      [
        candidate("Reliable Cheap Ramen", "PRICE_LEVEL_INEXPENSIVE", {
          rating: 4.3,
          userRatingCount: 200,
        }),
        candidate("Premium Kaiseki", "PRICE_LEVEL_EXPENSIVE", {
          rating: 4.9,
          userRatingCount: 3000,
        }),
      ],
    );

    expect(selected.map((item) => item.name)).toEqual(["Premium Kaiseki"]);
  });

  it("keeps premium paid candidates competitive when a balanced budget has enough daily room", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        budgetPlan: {
          dailyBudgetKrw: 300000,
          strategy: "balanced",
          totalBudgetKrw: 1800000,
        },
        durationMinutes: 60,
      },
      [
        candidate("Reliable Cheap Ramen", "PRICE_LEVEL_INEXPENSIVE", {
          rating: 4.3,
          userRatingCount: 200,
        }),
        candidate("Premium Kaiseki", "PRICE_LEVEL_EXPENSIVE", {
          rating: 4.9,
          userRatingCount: 3000,
        }),
      ],
    );

    expect(selected.map((item) => item.name)).toEqual(["Premium Kaiseki"]);
  });

  it("lets high-value farther places outrank nearby low-value options", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        budgetPlan: {
          dailyBudgetKrw: 200000,
          strategy: "balanced",
          totalBudgetKrw: 1200000,
        },
        durationMinutes: 60,

      },
      [
        candidate("Small Nearby Statue", undefined, {
          location: { lat: 33.587, lng: 130.402 },
          preferenceKind: "place",
          primaryType: "tourist_attraction",
          rating: 2,
          sourceTheme: "landmark",
          userRatingCount: 0,
        }),
        candidate("Famous Farther Tower", undefined, {
          location: { lat: 33.623, lng: 130.402 },
          preferenceKind: "place",
          primaryType: "tourist_attraction",
          rating: 4.9,
          sourceTheme: "landmark",
          userRatingCount: 10000,
        }),
      ],
    );

    expect(selected.map((item) => item.name)).toEqual(["Famous Farther Tower"]);
  });

  it("caps meal-heavy results and keeps a mixed day composition", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        durationMinutes: 480,
      },
      [
        candidate("Ramen 1", "PRICE_LEVEL_MODERATE"),
        candidate("Ramen 2", "PRICE_LEVEL_MODERATE"),
        candidate("Ramen 3", "PRICE_LEVEL_MODERATE"),
        candidate("Ramen 4", "PRICE_LEVEL_MODERATE"),
        candidate("Ramen 5", "PRICE_LEVEL_MODERATE"),
        candidate("Observation Deck", undefined, {
          preferenceKind: "place",
          primaryType: "tourist_attraction",
          sourceTheme: "landmark",
        }),
        candidate("City Museum", undefined, {
          preferenceKind: "place",
          primaryType: "museum",
          sourceTheme: "culture",
        }),
        candidate("Riverside Cafe", "PRICE_LEVEL_MODERATE", {
          primaryType: "cafe",
          sourceTheme: "cafe",
        }),
        candidate("Local Market", undefined, {
          preferenceKind: "place",
          primaryType: "market",
          sourceTheme: "shopping",
        }),
      ],
    );

    const selectedTypes = selected.map((item) => item.primaryType);

    expect(selected).toHaveLength(5);
    expect(selectedTypes.filter((type) => type === "restaurant")).toHaveLength(2);
    expect(selectedTypes).toEqual(
      expect.arrayContaining(["tourist_attraction", "museum", "cafe"]),
    );
  });

  it("limits relaxed three-place itineraries to one restaurant meal", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        targetPlaceCount: 3,
      },
      [
        candidate("Popular Ramen", "PRICE_LEVEL_MODERATE", {
          rating: 5,
          userRatingCount: 5000,
        }),
        candidate("Second Sushi", "PRICE_LEVEL_MODERATE", {
          rating: 4.9,
          userRatingCount: 4000,
          sourceTheme: "sushi",
        }),
        candidate("Third Izakaya", "PRICE_LEVEL_MODERATE", {
          rating: 4.8,
          userRatingCount: 3000,
          sourceTheme: "izakaya",
        }),
        candidate("Riverside Cafe", "PRICE_LEVEL_MODERATE", {
          primaryType: "cafe",
          sourceTheme: "cafe",
        }),
        candidate("Local Market", undefined, {
          preferenceKind: "place",
          primaryType: "market",
          sourceTheme: "shopping",
        }),
      ],
    );

    const restaurantCount = selected.filter((item) => item.primaryType === "restaurant").length;

    expect(selected).toHaveLength(3);
    expect(restaurantCount).toBe(1);
  });

  it("allows a tight itinerary to select seven places", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        durationMinutes: 720,

      },
      [
        candidate("Breakfast Ramen", "PRICE_LEVEL_MODERATE", { sourceTheme: "food" }),
        candidate("Lunch Sushi", "PRICE_LEVEL_MODERATE", { sourceTheme: "food" }),
        candidate("Dinner Izakaya", "PRICE_LEVEL_MODERATE", { sourceTheme: "food" }),
        candidate("Observation Deck", undefined, {
          preferenceKind: "place",
          primaryType: "tourist_attraction",
          sourceTheme: "landmark",
        }),
        candidate("City Museum", undefined, {
          preferenceKind: "place",
          primaryType: "museum",
          sourceTheme: "culture",
        }),
        candidate("Riverside Park", undefined, {
          preferenceKind: "place",
          primaryType: "park",
          sourceTheme: "nature",
        }),
        candidate("Temple Garden", undefined, {
          preferenceKind: "place",
          primaryType: "tourist_attraction",
          sourceTheme: "landmark",
        }),
        candidate("Local Market", undefined, {
          preferenceKind: "place",
          primaryType: "market",
          sourceTheme: "shopping",
        }),
        candidate("Shopping Arcade", undefined, {
          preferenceKind: "place",
          primaryType: "shopping_mall",
          sourceTheme: "shopping",
        }),
        candidate("Coffee Break", "PRICE_LEVEL_MODERATE", {
          primaryType: "cafe",
          sourceTheme: "cafe",
        }),
      ],
    );

    expect(selected.length).toBeGreaterThan(5);
    expect(selected).toHaveLength(7);
  });


  it("prefers different food categories over repeating ramen when multiple meals fit", () => {
    const selected = selectGoogleFirstCandidates(
      {
        ...baseRequest,
        durationMinutes: 480,
      },
      [
        candidate("Popular Hakata Ramen", "PRICE_LEVEL_MODERATE", {
          rating: 5,
          userRatingCount: 5000,
        }),
        candidate("Second Ramen Shop", "PRICE_LEVEL_MODERATE", {
          rating: 4.9,
          userRatingCount: 4000,
        }),
        candidate("Local Motsunabe Kitchen", "PRICE_LEVEL_MODERATE", {
          rating: 4.5,
          userRatingCount: 800,
        }),
        candidate("Observation Deck", undefined, {
          preferenceKind: "place",
          primaryType: "tourist_attraction",
          sourceTheme: "landmark",
        }),
        candidate("City Museum", undefined, {
          preferenceKind: "place",
          primaryType: "museum",
          sourceTheme: "culture",
        }),
        candidate("Riverside Cafe", "PRICE_LEVEL_MODERATE", {
          primaryType: "cafe",
          sourceTheme: "cafe",
        }),
      ],
    );

    expect(selected.map((item) => item.name)).toContain("Popular Hakata Ramen");
    expect(selected.map((item) => item.name)).toContain("Local Motsunabe Kitchen");
    expect(selected.map((item) => item.name)).not.toContain("Second Ramen Shop");
  });


});
