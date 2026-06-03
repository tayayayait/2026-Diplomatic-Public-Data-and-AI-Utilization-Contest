import { selectGoogleFirstCandidates } from "./src/lib/itinerary/google-itinerary-scoring";
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
import { resolveEffectiveItineraryBudgetStrategy } from "./src/lib/itinerary/budget-plan";

const candidates = [
  candidate("Cheap Ramen", "PRICE_LEVEL_INEXPENSIVE", { rating: 4.0, userRatingCount: 100 }),
  candidate("Luxury Dinner", "PRICE_LEVEL_EXPENSIVE", { rating: 5.0, userRatingCount: 10000 }),
];

const req = {
    ...baseRequest,
    budgetPlan: {
      dailyBudgetKrw: 50000,
      strategy: "balanced" as const,
      totalBudgetKrw: 300000,
    }
};

import * as originalScoring from './src/lib/itinerary/google-itinerary-scoring';

const c1 = originalScoring.selectGoogleFirstCandidates(req, [candidates[0]]);
const c2 = originalScoring.selectGoogleFirstCandidates(req, [candidates[1]]);

console.log("C1 score:", c1[0]?.score);
console.log("C2 score:", c2[0]?.score);
