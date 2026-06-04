import { describe, expect, it } from "vitest";

import type { ItineraryPlace } from "@/lib/gemini/schema";
import { createGeminiGuidedGoogleItinerary } from "./gemini-guided-google-itinerary";

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });

const makeDraftPlace = (override: Partial<ItineraryPlace>): ItineraryPlace => ({
  category: "attraction",
  description: "Gemini selected this stop for the user's route and budget.",
  endTime: "10:20",
  estimatedCost: "Gemini estimate",
  estimatedMinutes: 70,
  koName: "Canal City Hakata",
  lat: 0,
  lng: 0,
  mealSlot: "none",
  order: 1,
  placeIntroduction:
    "Canal City Hakata is a large shopping and entertainment complex in central Fukuoka. Travelers can combine shopping, food, and a city landmark stop in one place.",
  placeName: "Canal City Hakata",
  startTime: "09:00",
  theme: "shopping and landmark",
  travelFromPrevDistance: "unknown",
  travelFromPrevMinutes: 0,
  ...override,
});

const baseRequest = {
  budget: "balanced",
  budgetPlan: {
    dailyBudgetKrw: 70000,
    strategy: "balanced" as const,
    totalBudgetKrw: 500000,
  },
  city: "Fukuoka",
  country: "JP",
  departure: {
    address: "Hakata Station",
    lat: 33.5902,
    lng: 130.4206,
  },
  durationMinutes: 240,
  excludedGooglePlaceIds: [],
  excludedPlaceNames: [],
  searchRadiusMeters: 3000,
  sortMode: "route_optimized" as const,
  startTime: "09:00",
  travelModes: ["WALK"] as const,
};

describe("Gemini-guided Google itinerary matching", () => {
  it("matches Gemini draft places to Google Places and replaces generated coordinates with actual route data", async () => {
    const requests: Array<{ body: any; url: string }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;
      requests.push({ body, url });

      if (url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Canal City Hakata" },
              formattedAddress: "1-2 Sumiyoshi, Hakata Ward, Fukuoka",
              googleMapsUri: "https://maps.google.com/?cid=canal",
              id: "canal-city-google-id",
              location: { latitude: 33.5898, longitude: 130.4111 },
              priceLevel: "PRICE_LEVEL_FREE",
              primaryType: "shopping_mall",
              rating: 4.2,
              regularOpeningHours: { openNow: true },
              userRatingCount: 12000,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 900, duration: "600s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGeminiGuidedGoogleItinerary(
      baseRequest,
      [makeDraftPlace({ koName: "커낼시티 하카타" })],
      { fetcher, googleApiKey: "google-key" },
    );

    const textSearchRequest = requests.find((request) => request.url.includes("places:searchText"));
    expect(textSearchRequest?.body.textQuery).toBe("Canal City Hakata Fukuoka JP");
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      category: "shopping",
      estimatedCost: "Google price: free",
      estimatedMinutes: 70,
      googlePlaceId: "canal-city-google-id",
      koName: "커낼시티 하카타",
      lat: 33.5898,
      lng: 130.4111,
      placeIntroduction:
        "[AI 추천: 커낼시티 하카타] Canal City Hakata is a large shopping and entertainment complex in central Fukuoka. Travelers can combine shopping, food, and a city landmark stop in one place.",
      placeName: "Canal City Hakata",
      mealSlot: "none",
      startTime: "09:10",
      endTime: "10:20",
      travelFromPrevDistance: "900m",
      travelFromPrevMinutes: 10,
      travelMode: expect.any(String),
    });
    expect(places[0].recommendationContext).toMatchObject({
      matchedPreference: "shopping and landmark",
      openingNow: true,
      priceLevel: "PRICE_LEVEL_FREE",
      rating: 4.2,
      routeDistanceMeters: 900,
      routeDurationMinutes: 10,
      source: "google_places",
      userRatingCount: 12000,
    });
  });

  it("reorders matched Gemini draft stops by the route from the accommodation", async () => {
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;

      if (url.includes("places:searchText")) {
        const textQuery = body.textQuery as string;
        const placeByQuery = textQuery.startsWith("Far Tower")
          ? {
              displayName: { text: "Far Tower" },
              id: "far-tower-id",
              location: { latitude: 0, longitude: 10 },
              primaryType: "tourist_attraction",
            }
          : textQuery.startsWith("Nearby Ramen")
            ? {
                displayName: { text: "Nearby Ramen" },
                id: "nearby-ramen-id",
                location: { latitude: 0, longitude: 1 },
                primaryType: "restaurant",
              }
            : {
                displayName: { text: "Middle Shrine" },
                id: "middle-shrine-id",
                location: { latitude: 0, longitude: 2 },
                primaryType: "tourist_attraction",
              };

        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              rating: 4.5,
              regularOpeningHours: { openNow: true },
              userRatingCount: 500,
              ...placeByQuery,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        const origin = body.origin.location.latLng;
        const destination = body.destination.location.latLng;
        const distanceMeters = Math.round(
          Math.abs(destination.longitude - origin.longitude) * 1000,
        );

        return okJson({
          routes: [{ distanceMeters, duration: `${Math.max(60, distanceMeters * 0.6)}s` }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGeminiGuidedGoogleItinerary(
      {
        ...baseRequest,
        departure: { lat: 0, lng: 0 },
        startTime: "09:00",
        targetPlaceCount: 3,
      },
      [
        makeDraftPlace({ order: 1, placeName: "Far Tower", koName: "Far Tower" }),
        makeDraftPlace({
          category: "restaurant",
          mealSlot: "meal",
          order: 2,
          placeName: "Nearby Ramen",
          koName: "Nearby Ramen",
        }),
        makeDraftPlace({ order: 3, placeName: "Middle Shrine", koName: "Middle Shrine" }),
      ],
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.map((place) => place.placeName)).toEqual([
      "Nearby Ramen",
      "Middle Shrine",
      "Far Tower",
    ]);
    expect(places.map((place) => place.order)).toEqual([1, 2, 3]);
    expect(places.map((place) => place.travelFromPrevMinutes)).toEqual([10, 10, 80]);
  });

  it("does not reuse excluded or already matched Google places across Gemini draft slots", async () => {
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;

      if (url.includes("places:searchText") && body.textQuery.startsWith("Old Market")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Old Market" },
              id: "old-market-id",
              location: { latitude: 33.591, longitude: 130.42 },
              primaryType: "market",
              rating: 4.9,
              userRatingCount: 1000,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Yanagibashi Rengo Market" },
              id: "fresh-market-id",
              location: { latitude: 33.585, longitude: 130.41 },
              primaryType: "market",
              rating: 4.2,
              userRatingCount: 900,
            },
          ],
        });
      }

      if (url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Yanagibashi Rengo Market" },
              id: "fresh-market-id",
              location: { latitude: 33.585, longitude: 130.41 },
              primaryType: "market",
              rating: 4.2,
              userRatingCount: 900,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Fukuoka Asian Art Museum" },
              id: "asian-art-id",
              location: { latitude: 33.594, longitude: 130.405 },
              primaryType: "museum",
              rating: 4.3,
              userRatingCount: 700,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 600, duration: "420s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGeminiGuidedGoogleItinerary(
      {
        ...baseRequest,
        excludedGooglePlaceIds: ["old-market-id"],
        excludedPlaceNames: ["Old Market"],
      },
      [
        makeDraftPlace({ placeName: "Old Market", koName: "Old Market", order: 1 }),
        makeDraftPlace({
          category: "culture",
          placeName: "Fukuoka Asian Art Museum",
          koName: "Fukuoka Asian Art Museum",
          order: 2,
        }),
      ],
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.map((place) => place.googlePlaceId)).toEqual([
      "fresh-market-id",
      "asian-art-id",
    ]);
    expect(places.map((place) => place.placeName)).toEqual([
      "Yanagibashi Rengo Market",
      "Fukuoka Asian Art Museum",
    ]);
  });

  it("can match a farther high-value Google place within the travel-mode hard cap", async () => {
    const fetcher = async (input: string | URL) => {
      const url = input.toString();

      if (url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Small Nearby Viewpoint" },
              id: "nearby-viewpoint-id",
              location: { latitude: 33.591, longitude: 130.421 },
              primaryType: "tourist_attraction",
              rating: 2,
              regularOpeningHours: { openNow: true },
              userRatingCount: 0,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Famous Farther Tower" },
              id: "famous-farther-tower-id",
              location: { latitude: 33.626, longitude: 130.421 },
              primaryType: "tourist_attraction",
              rating: 4.9,
              regularOpeningHours: { openNow: true },
              userRatingCount: 12000,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 4200, duration: "1800s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGeminiGuidedGoogleItinerary(
      baseRequest,
      [
        makeDraftPlace({
          placeName: "Landmark viewpoint",
          koName: "Landmark viewpoint",
        }),
      ],
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.map((place) => place.googlePlaceId)).toEqual([
      "famous-farther-tower-id",
    ]);
  });

  it("does not exclude a famous expensive Google match when the strategy is saving", async () => {
    const fetcher = async (input: string | URL) => {
      const url = input.toString();

      if (url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Famous Reservation Restaurant" },
              id: "famous-reservation-restaurant-id",
              location: { latitude: 33.591, longitude: 130.421 },
              priceLevel: "PRICE_LEVEL_EXPENSIVE",
              primaryType: "restaurant",
              rating: 4.9,
              regularOpeningHours: { openNow: true },
              userRatingCount: 12000,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 900, duration: "600s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGeminiGuidedGoogleItinerary(
      {
        ...baseRequest,
        budgetPlan: {
          dailyBudgetKrw: 50000,
          strategy: "saving",
          totalBudgetKrw: 300000,
        },
      },
      [
        makeDraftPlace({
          category: "restaurant",
          mealSlot: "lunch",
          placeName: "Famous restaurant",
          koName: "Famous restaurant",
        }),
      ],
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.map((place) => place.googlePlaceId)).toEqual([
      "famous-reservation-restaurant-id",
    ]);
    expect(places[0].mealSlot).toBe("meal");
  });

  it("caps matched Gemini draft meals and cafes to the selected normal intensity composition", async () => {
    const typeByName = new Map([
      ["Ramen One", "restaurant"],
      ["Sushi Two", "restaurant"],
      ["Izakaya Three", "restaurant"],
      ["Cafe One", "cafe"],
      ["Dessert Two", "cafe"],
      ["Observation Deck", "tourist_attraction"],
      ["City Museum", "museum"],
      ["Local Market", "market"],
      ["Riverside Park", "park"],
    ]);
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;

      if (url.includes("places:searchText")) {
        const matchedName = [...typeByName.keys()].find((name) =>
          body.textQuery.startsWith(name),
        );
        if (!matchedName) throw new Error(`Unexpected text query: ${body.textQuery}`);

        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: matchedName },
              id: `${matchedName.toLowerCase().replaceAll(" ", "-")}-id`,
              location: { latitude: 33.59, longitude: 130.41 },
              primaryType: typeByName.get(matchedName),
              rating: 4.5,
              regularOpeningHours: { openNow: true },
              userRatingCount: 1000,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 300, duration: "300s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGeminiGuidedGoogleItinerary(
      {
        ...baseRequest,
        targetPlaceCount: 5,
      },
      [
        makeDraftPlace({ category: "restaurant", mealSlot: "meal", order: 1, placeName: "Ramen One", koName: "Ramen One" }),
        makeDraftPlace({ category: "restaurant", mealSlot: "meal", order: 2, placeName: "Sushi Two", koName: "Sushi Two" }),
        makeDraftPlace({ category: "restaurant", mealSlot: "meal", order: 3, placeName: "Izakaya Three", koName: "Izakaya Three" }),
        makeDraftPlace({ category: "cafe", mealSlot: "snack", order: 4, placeName: "Cafe One", koName: "Cafe One" }),
        makeDraftPlace({ category: "cafe", mealSlot: "snack", order: 5, placeName: "Dessert Two", koName: "Dessert Two" }),
        makeDraftPlace({ category: "attraction", mealSlot: "none", order: 6, placeName: "Observation Deck", koName: "Observation Deck" }),
        makeDraftPlace({ category: "culture", mealSlot: "none", order: 7, placeName: "City Museum", koName: "City Museum" }),
        makeDraftPlace({ category: "shopping", mealSlot: "none", order: 8, placeName: "Local Market", koName: "Local Market" }),
        makeDraftPlace({ category: "nature", mealSlot: "none", order: 9, placeName: "Riverside Park", koName: "Riverside Park" }),
      ],
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places).toHaveLength(5);
    expect(places.filter((place) => place.category === "restaurant")).toHaveLength(1);
    expect(places.filter((place) => place.category === "cafe")).toHaveLength(1);
    expect(places.map((place) => place.order)).toEqual([1, 2, 3, 4, 5]);
  });
});

