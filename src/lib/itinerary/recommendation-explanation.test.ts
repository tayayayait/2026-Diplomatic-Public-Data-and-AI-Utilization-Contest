import { describe, expect, it } from "vitest";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import {
  createPlaceEvidenceBadges,
  createRecommendationCriteriaViewModel,
  formatDistanceForEvidence,
} from "./recommendation-explanation";

const makePlace = (override: Partial<ItineraryPlace>): ItineraryPlace => ({
  category: "restaurant",
  description: "?좏깮??痍⑦뼢怨??쇱튂?⑸땲??",
  endTime: "10:30",
  estimatedCost: "Google 媛寃⑸?: ???",
  estimatedMinutes: 75,
  koName: "?섏뭅? ?쇰찘",
  lat: 33.588,
  lng: 130.402,
  mealSlot: "lunch",
  order: 1,
  placeName: "Hakata Local Ramen",
  startTime: "09:15",
  theme: "?꾩? 濡쒖뺄 留쏆쭛",
  travelFromPrevDistance: "850m",
  travelFromPrevMinutes: 12,
  ...override,
});

describe("recommendation explanation", () => {
  it("formats evidence distances without inventing precision", () => {
    expect(formatDistanceForEvidence(850)).toBe("850m");
    expect(formatDistanceForEvidence(1234)).toBe("1.2km");
  });

  it("summarizes the active Google-first recommendation criteria", () => {
    const model = createRecommendationCriteriaViewModel([
      makePlace({
        recommendationContext: {
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
      }),
    ]);

    expect(model.sourceLabel).toBe("Google Places + Routes");
    expect(model.sortLabel).toBe("?먯닔 ?곸쐞 ?꾨낫瑜??숈꽑 ?⑥쑉 ?쒖꽌濡??ъ젙??)";
    expect(model.signalLabels).toEqual([
      "?숈꽑 ?⑥쑉 30??",
      "Google ?됱젏/由щ럭 40??",
      "?곸뾽?쒓컙 15??",
      "媛寃⑸? 10??",
      "移댄뀒怨좊━ ?ㅼ뼇??5??",
    ]);
    expect(model.exclusionLabel).toBe("?꾩떆/?곴뎄 ?먯뾽, 醫뚰몴 ?녿뒗 ?μ냼 ?쒖쇅");
  });

  it("marks Gemini fallback results as unverified by Google Places", () => {
    const model = createRecommendationCriteriaViewModel([
      makePlace({
        recommendationContext: {
          searchRadiusMeters: 3000,
          sortMode: "route_optimized",
          source: "gemini",
        },
      }),
    ]);

    expect(model.sourceLabel).toBe("Gemini fallback");
    expect(model.dataBasisLabel).toBe("Google Places ?꾨낫媛 ?녾굅???ㅺ? ?놁뼱 AI ?앹꽦 寃곌낵瑜??ъ슜");
  });

  it("creates compact per-place evidence badges from Google metadata", () => {
    const badges = createPlaceEvidenceBadges(
      makePlace({
        recommendationContext: {
          distanceFromDepartureMeters: 850,
          matchedPreference: "?꾩? 濡쒖뺄 留쏆쭛",
          openingNow: true,
          preferenceKind: "food",
          priceLevel: "PRICE_LEVEL_INEXPENSIVE",
          rating: 4.6,
          score: 87.3,
          searchRadiusMeters: 3000,
          sortMode: "route_optimized",
          source: "google_places",
          userRatingCount: 900,
        },
      }),
    );

    expect(badges).toEqual([
      "痍⑦뼢: ?꾩? 濡쒖뺄 留쏆쭛",
      "異쒕컻吏 850m",
      "?됱젏 4.6",
      "由щ럭 900",
      "?곸뾽 以?",
      "媛寃⑸? ???",
      "?먯닔 87.3",
    ]);
  });
});
