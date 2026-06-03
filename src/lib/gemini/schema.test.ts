import { describe, expect, it } from "vitest";
import { parseGeminiItineraryResponseText } from "./schema";

const validPlace = {
  order: 1,
  placeName: "Ohori Park",
  koName: "?ㅽ샇由?怨듭썝",
  category: "nature",
  theme: "?먯뿰 ???댁떇",
  placeIntroduction:
    "?ㅽ샇由?怨듭썝? ?꾩퓼?ㅼ뭅 ?꾩떖???덈뒗 ???곕せ 以묒떖??怨듭썝?낅땲?? ?곗콉濡쒖? ?댁떇 怨듦컙????媛뽰떠???덉뼱 ?ы뻾 以??ъ쑀瑜??먮겮湲?醫뗭? ?μ냼?낅땲??",
  description: "?꾩떖?먯꽌 ?묎렐?섍린 醫뗭? 怨듭썝?낅땲??",
  startTime: "09:15",
  endTime: "10:30",
  estimatedMinutes: 75,
  estimatedCost: "臾대즺",
  travelFromPrevMinutes: 15,
  travelFromPrevDistance: "1.2km, ?꾨낫 15遺?",
  mealSlot: "none",
  lat: 33.586,
  lng: 130.376,
};

describe("Gemini itinerary schema", () => {
  it("parses valid Gemini itinerary JSON into typed itinerary places", () => {
    const result = parseGeminiItineraryResponseText(JSON.stringify([validPlace]));

    expect(result).toEqual([validPlace]);
  });

  it("accepts optional recommendation evidence metadata", () => {
    const placeWithEvidence = {
      ...validPlace,
      recommendationContext: {
        businessStatus: "OPERATIONAL",
        distanceFromDepartureMeters: 850,
        matchedPreference: "?꾩? 濡쒖뺄 留쏆쭛",
        openingNow: true,
        preferenceKind: "food",
        rating: 4.6,
        routeDistanceMeters: 850,
        routeDurationMinutes: 12,
        score: 87.3,
        searchRadiusMeters: 3000,
        sortMode: "route_optimized",
        source: "google_places",
        userRatingCount: 900,
      },
    };

    const result = parseGeminiItineraryResponseText(JSON.stringify([placeWithEvidence]));

    expect(result[0].recommendationContext).toMatchObject({
      matchedPreference: "?꾩? 濡쒖뺄 留쏆쭛",
      rating: 4.6,
      source: "google_places",
    });
  });

  it("rejects itinerary places missing timeline fields", () => {
    const { startTime: _startTime, ...missingStartTime } = validPlace;

    expect(() => parseGeminiItineraryResponseText(JSON.stringify([missingStartTime]))).toThrow(
      "Invalid Gemini itinerary response schema",
    );
  });

  it("rejects itinerary places missing a Gemini place introduction", () => {
    const { placeIntroduction: _placeIntroduction, ...missingPlaceIntroduction } = validPlace;

    expect(() => parseGeminiItineraryResponseText(JSON.stringify([missingPlaceIntroduction]))).toThrow(
      "Invalid Gemini itinerary response schema",
    );
  });

  it("rejects malformed Gemini itinerary JSON", () => {
    expect(() => parseGeminiItineraryResponseText("{")).toThrow(
      "Invalid Gemini itinerary JSON",
    );
  });
});
