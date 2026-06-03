import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import { RecommendationCriteriaPanel } from "./RecommendationCriteriaPanel";

const place: ItineraryPlace = {
  category: "restaurant",
  description: "Matches the selected food preference.",
  endTime: "10:30",
  estimatedCost: "Google price: unavailable",
  estimatedMinutes: 75,
  koName: "Hakata Local Ramen",
  lat: 33.588,
  lng: 130.402,
  mealSlot: "lunch",
  order: 1,
  placeName: "Hakata Local Ramen",
  recommendationContext: {
    distanceFromDepartureMeters: 850,
    matchedPreference: "local food",
    rating: 4.6,
    searchRadiusMeters: 3000,
    sortMode: "route_optimized",
    source: "google_places",
    userRatingCount: 900,
  },
  startTime: "09:15",
  theme: "local food",
  travelFromPrevDistance: "850m",
  travelFromPrevMinutes: 12,
};

describe("RecommendationCriteriaPanel", () => {
  it("renders the source, radius, sort mode, and scoring basis", () => {
    const markup = renderToStaticMarkup(<RecommendationCriteriaPanel places={[place]} />);

    expect(markup).toContain("Google Places + Routes");
    expect(markup).toContain("Top-scoring candidates reordered for route efficiency.");
    expect(markup).toContain("Route efficiency 30 pts");
    expect(markup).toContain("Exclude unsupported cities");
  });
});
