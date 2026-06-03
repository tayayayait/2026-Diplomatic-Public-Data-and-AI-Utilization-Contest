import { describe, expect, it } from "vitest";
import {
  enrichLocalItinerary,
  estimateCostFromPlaceData,
  formatDistanceMeters,
  parseGoogleDurationToMinutes,
  recommendDurationFromPlaceData,
} from "./itinerary-enrichment";
import type { ItineraryContext, LocalItineraryResult } from "./gemini-recommendation";

describe("itinerary enrichment", () => {
  it("parses Google Routes duration strings into rounded minutes", () => {
    expect(parseGoogleDurationToMinutes("540s")).toBe(9);
    expect(parseGoogleDurationToMinutes("30s")).toBe(1);
    expect(parseGoogleDurationToMinutes("bad")).toBeUndefined();
  });

  it("formats route distance for card display", () => {
    expect(formatDistanceMeters(850)).toBe("850m");
    expect(formatDistanceMeters(1250)).toBe("1.3km");
  });

  it("uses Google Places price level before falling back to AI estimates", () => {
    expect(estimateCostFromPlaceData("cafe", "PRICE_LEVEL_MODERATE", 50000)).toMatchObject({
      costSource: "google_places_price_level",
      estimatedCostKrw: 14000,
    });
    expect(estimateCostFromPlaceData("cafe", undefined, 7000)).toMatchObject({
      costSource: "ai_estimate",
      estimatedCostKrw: 7000,
    });
  });

  it("derives recommended dwell time from Google primary type and local rules", () => {
    expect(recommendDurationFromPlaceData("other", "market")).toMatchObject({
      durationMinutes: 90,
      durationSource: "place_type_rule",
    });
    expect(recommendDurationFromPlaceData("cafe")).toMatchObject({
      durationMinutes: 45,
      durationSource: "place_type_rule",
    });
  });

  it("enriches itinerary cards with Google place, route, price, and evidence fields", async () => {
    const context: ItineraryContext = {
      accommodationLocation: "Holland Park, London",
      country: "영국",
      city: "런던",
      stayDays: 7,
      stayPurpose: "여행",
      totalBudgetKrw: 800000,
    };
    const itinerary: LocalItineraryResult = {
      title: "런던 코스",
      description: "테스트",
      totalEstimatedCostKrw: 6000,
      itinerary: [
        {
          timeOfDay: "Morning",
          places: [
            {
              name: "Monmouth Coffee Company",
              address: "27 Monmouth St, London WC2H 9EU",
              description: "커피",
              durationMinutes: 30,
              estimatedCostKrw: 6000,
              reason: "평점이 좋음",
              travelTimeFromPreviousMinutes: 45,
              type: "cafe",
            },
          ],
        },
      ],
      tips: [],
    };
    const fetcher = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes("places:searchText")) {
        const body = JSON.parse(String(init?.body));
        const isHotelLookup = body.textQuery.includes("Holland Park");

        return Response.json({
          places: [
            {
              displayName: { text: isHotelLookup ? "Holland Park" : "Monmouth Coffee Company" },
              formattedAddress: isHotelLookup
                ? "Holland Park, London W8, United Kingdom"
                : "27 Monmouth St, London WC2H 9EU, United Kingdom",
              googleMapsUri: "https://www.google.com/maps/place/Monmouth+Coffee+Company",
              id: isHotelLookup ? "origin-id" : "place-id",
              location: isHotelLookup
                ? { latitude: 51.502, longitude: -0.203 }
                : { latitude: 51.514, longitude: -0.126 },
              priceLevel: "PRICE_LEVEL_MODERATE",
              primaryType: isHotelLookup ? "park" : "cafe",
              rating: 4.5,
              regularOpeningHours: { openNow: true },
              reviews: [{ text: { text: "Good coffee." }, rating: 5 }],
              userRatingCount: 1200,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return Response.json({
          routes: [{ distanceMeters: 2500, duration: "1800s" }],
        });
      }

      return new Response(null, { status: 404 });
    };

    const result = await enrichLocalItinerary(itinerary, context, {
      fetcher,
      googleApiKey: "test-key",
    });
    const place = result.itinerary[0].places[0];

    expect(place.googlePlaceId).toBe("place-id");
    expect(place.googleMapsUri).toBe("https://www.google.com/maps/place/Monmouth+Coffee+Company");
    expect(place.travelTimeFromPreviousMinutes).toBe(30);
    expect(place.distanceMetersFromPrevious).toBe(2500);
    expect(place.estimatedCostKrw).toBe(14000);
    expect(place.durationMinutes).toBe(45);
    expect(place.placeDataSource).toBe("google_places");
    expect(place.travelTimeSource).toBe("google_routes");
    expect(result.totalEstimatedCostKrw).toBe(14000);
  });
});
