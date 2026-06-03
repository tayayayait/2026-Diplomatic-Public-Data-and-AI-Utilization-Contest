import { haversineMeters } from "./src/lib/itinerary/google-itinerary-scoring";
import { getRadiusPolicyForTravelModes, getRecommendationCategoryGroup, RECOMMENDATION_SCORE_WEIGHTS, DAILY_ITINERARY_CATEGORY_TARGETS } from "./src/lib/itinerary/recommendation-policy";
import { resolveEffectiveItineraryBudgetStrategy } from "./src/lib/itinerary/budget-plan";

const baseRequest = {
  city: "Fukuoka",
  country: "JP",
  departure: { lat: 33.5868, lng: 130.4017 },
  durationMinutes: 60,
  excludedGooglePlaceIds: [],
  excludedPlaceNames: [],
  searchRadiusMeters: 3000,
  sortMode: "route_optimized" as const,
  startTime: "09:00",
  travelModes: ["WALK"] as ("WALK")[],
};
const candidate = (
  name: string,
  priceLevel: any,
  overrides: any = {},
) => ({
  businessStatus: "OPERATIONAL" as const,
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
    rankPreference: "POPULARITY" as const,
    searchQueries: ["local restaurant"],
    sourceTheme: "현지 로컬 맛집",
  },
  sourceTheme: "현지 로컬 맛집",
  userRatingCount: 900,
  ...overrides,
});

const getCategoryBudgetKrw = (
  request: any,
  category: any,
) => {
  const budgetPlan = request.budgetPlan;
  if (!budgetPlan) return undefined;

  const localBudget =
    category === "meal" || category === "cafe"
      ? budgetPlan.dailyLocalBudget?.food
      : budgetPlan.dailyLocalBudget?.activity;
  if (
    typeof localBudget === "number" &&
    Number.isFinite(localBudget) &&
    typeof budgetPlan.exchangeRateKrwPerLocal === "number" &&
    Number.isFinite(budgetPlan.exchangeRateKrwPerLocal) &&
    budgetPlan.exchangeRateKrwPerLocal > 0
  ) {
    return localBudget * budgetPlan.exchangeRateKrwPerLocal;
  }

  if (
    typeof budgetPlan.dailyBudgetKrw === "number" &&
    Number.isFinite(budgetPlan.dailyBudgetKrw) &&
    budgetPlan.dailyBudgetKrw > 0
  ) {
    const budgetShareByCategory: Record<string, number> = {
      attraction: 0.2,
      cafe: 0.3,
      meal: 0.3,
      other: 0.2,
      shoppingOrExperience: 0.2,
    };
    return budgetPlan.dailyBudgetKrw * budgetShareByCategory[category];
  }

  return undefined;
};

const getEstimatedPriceKrw = (
  candidate: any,
  category: any,
) => {
  if (!candidate.priceLevel) return undefined;
  const foodPriceEstimateKrwByLevel: Record<string, number> = {
    PRICE_LEVEL_EXPENSIVE: 70000,
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 15000,
    PRICE_LEVEL_MODERATE: 30000,
    PRICE_LEVEL_VERY_EXPENSIVE: 120000,
  };
  const activityPriceEstimateKrwByLevel: Record<string, number> = {
    PRICE_LEVEL_EXPENSIVE: 60000,
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 10000,
    PRICE_LEVEL_MODERATE: 25000,
    PRICE_LEVEL_VERY_EXPENSIVE: 100000,
  };

  if (category === "meal" || category === "cafe") {
    return foodPriceEstimateKrwByLevel[candidate.priceLevel];
  }

  if (category === "attraction" || category === "shoppingOrExperience") {
    return activityPriceEstimateKrwByLevel[candidate.priceLevel];
  }

  return undefined;
};


const getBudgetAmountFitScore = (
  candidate: any,
  request: any,
) => {
  const category = getRecommendationCategoryGroup(candidate);
  const estimatedPriceKrw = getEstimatedPriceKrw(candidate, category);
  const categoryBudgetKrw = getCategoryBudgetKrw(request, category);
  console.log(candidate.name, "amount:", { estimatedPriceKrw, categoryBudgetKrw });
  if (estimatedPriceKrw === undefined || categoryBudgetKrw === undefined) return undefined;
  if (estimatedPriceKrw <= 0) return 1;

  const ratio = estimatedPriceKrw / Math.max(categoryBudgetKrw, 1);
  if (ratio <= 1) return 1;
  if (ratio <= 1.5) return 0.9;
  if (ratio <= 2.5) return 0.75;
  return 0.55;
};

const candidates = [
  candidate("Cheap Ramen", "PRICE_LEVEL_INEXPENSIVE", { rating: 4.0, userRatingCount: 100 }),
  candidate("Luxury Dinner", "PRICE_LEVEL_EXPENSIVE", { rating: 5.0, userRatingCount: 10000 }),
];

const request = {
    ...baseRequest,
    budgetPlan: {
      dailyBudgetKrw: 50000,
      strategy: "balanced" as const,
      totalBudgetKrw: 300000,
    }
  };

for (const c of candidates) {
    console.log(c.name, getBudgetAmountFitScore(c, request));
}

