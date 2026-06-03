import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ItineraryPlace } from "@/lib/gemini/schema";
import { TimelineView } from "./TimelineView";

const place: ItineraryPlace = {
  category: "restaurant",
  description: "Recommended from the selected local food preference and Google rating.",
  endTime: "10:30",
  estimatedCost: "Google price: unavailable",
  estimatedMinutes: 75,
  koName: "Hakata Local Ramen",
  lat: 33.588,
  lng: 130.402,
  mealSlot: "lunch",
  order: 1,
  placeIntroduction:
    "Hakata Local Ramen is a practical meal stop for quickly experiencing a local flavor during the itinerary.",
  placeName: "Hakata Local Ramen",
  googlePlaceId: "ChIJh1ExamplePlaceId",
  recommendationContext: {
    budgetStrategy: "balanced",
    matchedPreference: "local food",
    rating: 4.6,
    routeDurationMinutes: 12,
    source: "google_places",
    userRatingCount: 3888,
  },
  photoUrl: "https://example.com/ramen.jpg",
  startTime: "09:15",
  theme: "local food",
  travelFromPrevDistance: "850m",
  travelFromPrevMinutes: 12,
  travelMode: "Walk",
};

describe("TimelineView", () => {
  it("renders recommendation result cards with trip facts and a Google Maps link", () => {
    const markup = renderToStaticMarkup(
      <TimelineView places={[place]} onSelect={() => undefined} onShowMapRoute={() => undefined} />,
    );

    expect(markup).toContain("Hakata Local Ramen");
    expect(markup).toContain("Place thumbnail");
    expect(markup).toContain("https://example.com/ramen.jpg");
    expect(markup).toContain("4.6");
    expect(markup).toContain("Reviews 3,888");
    expect(markup).toContain("Walk");
    expect(markup).toContain("75");
    expect(markup).toContain("Google price: unavailable");
    expect(markup).toContain("850m");
    expect(markup).toContain(
      'href="https://www.google.com/maps/search/?api=1&amp;query=Hakata+Local+Ramen&amp;query_place_id=ChIJh1ExamplePlaceId"',
    );
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it("marks the selected card with its matching map marker number", () => {
    const markup = renderToStaticMarkup(
      <TimelineView
        places={[place, { ...place, order: 2, koName: "Second Stop", placeName: "Second Stop" }]}
        selectedIndex={0}
        onSelect={() => undefined}
      />,
    );

    expect(markup).toContain('data-selected-card="true"');
    expect(markup).toContain('data-map-marker-number="1"');
    expect(markup).toContain('aria-current="location"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain("Map marker 1");
  });
});
