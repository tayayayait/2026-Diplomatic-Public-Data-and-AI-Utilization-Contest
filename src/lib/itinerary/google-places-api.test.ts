import { describe, expect, it } from "vitest";

import type { GooglePlaceSearchIntent, LocalItineraryRecommendationRequest } from "./recommendation-policy";
import { fetchNearbyGooglePlaces, fetchTextGooglePlaces, type Fetcher } from "./google-places-api";

const request: LocalItineraryRecommendationRequest = {
  budgetPlan: {
    dailyBudgetKrw: 200000,
    strategy: "balanced",
    totalBudgetKrw: 1000000,
  },
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

const intent: GooglePlaceSearchIntent = {
  defaultRadiusMeters: 3000,
  expandedRadiusMeters: 5000,
  includedTypes: ["tourist_attraction"],
  maxRadiusMeters: 8000,
  preferenceKind: "place",
  rankPreference: "POPULARITY",
  searchQueries: ["landmark"],
  sourceTheme: "landmark",
};

const createCapturingFetcher = () => {
  const bodies: Record<string, unknown>[] = [];
  const fetcher: Fetcher = async (_url, init) => {
    bodies.push(JSON.parse(init?.body as string) as Record<string, unknown>);
    return new Response(JSON.stringify({ places: [] }), { status: 200 });
  };

  return { bodies, fetcher };
};

describe("Google Places itinerary candidate requests", () => {
  it("uses the travel-mode hard cap radius for nearby candidate collection", async () => {
    const { bodies, fetcher } = createCapturingFetcher();

    await fetchNearbyGooglePlaces(request, intent, {
      fetcher,
      googleApiKey: "test-key",
    });

    expect(bodies[0]).toMatchObject({
      locationRestriction: {
        circle: {
          radius: 8000,
        },
      },
    });
  });

  it("uses the travel-mode hard cap radius for text-search location bias", async () => {
    const { bodies, fetcher } = createCapturingFetcher();

    await fetchTextGooglePlaces(request, intent, {
      fetcher,
      googleApiKey: "test-key",
    });

    expect(bodies[0]).toMatchObject({
      locationBias: {
        circle: {
          radius: 8000,
        },
      },
    });
  });
});
