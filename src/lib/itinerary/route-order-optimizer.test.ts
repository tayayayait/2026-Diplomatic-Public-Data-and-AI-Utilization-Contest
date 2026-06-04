import { describe, expect, it } from "vitest";

import type { ItineraryPlace } from "@/lib/gemini/schema";
import { optimizeItineraryPlaceOrderByRoute } from "./route-order-optimizer";

const makePlace = (
  name: string,
  lat: number,
  lng: number,
  overrides: Partial<ItineraryPlace> = {},
): ItineraryPlace => ({
  category: "attraction",
  description: name,
  endTime: "10:00",
  estimatedCost: "0",
  estimatedMinutes: 30,
  koName: name,
  lat,
  lng,
  mealSlot: "none",
  order: 1,
  placeIntroduction: name,
  placeName: name,
  startTime: "09:00",
  theme: "test",
  travelFromPrevDistance: "",
  travelFromPrevMinutes: 0,
  ...overrides,
});

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });

describe("route order optimizer", () => {
  it("orders stops from the accommodation by shortest available route leg", async () => {
    const requests: Array<{ body: any }> = [];
    const fetcher = async (_input: string | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body.toString()) : null;
      requests.push({ body });

      const origin = body.origin.location.latLng;
      const destination = body.destination.location.latLng;
      const legKey = [
        origin.latitude.toFixed(3),
        origin.longitude.toFixed(3),
        destination.latitude.toFixed(3),
        destination.longitude.toFixed(3),
      ].join("|");
      const routeByLeg: Record<string, { distanceMeters: number; duration: string }> = {
        "0.000|0.000|0.000|3.000": { distanceMeters: 3000, duration: "1800s" },
        "0.000|0.000|0.000|1.000": { distanceMeters: 1000, duration: "600s" },
        "0.000|1.000|0.000|3.000": { distanceMeters: 2000, duration: "1200s" },
      };

      return okJson({ routes: [routeByLeg[legKey] ?? { distanceMeters: 9999, duration: "9999s" }] });
    };

    const optimized = await optimizeItineraryPlaceOrderByRoute({
      departure: { lat: 0, lng: 0 },
      options: { fetcher, googleApiKey: "google-key" },
      places: [
        makePlace("far-high-score", 0, 3, {
          order: 1,
          recommendationContext: { score: 99, source: "google_places" },
        }),
        makePlace("near-low-score", 0, 1, {
          order: 2,
          recommendationContext: { score: 10, source: "google_places" },
        }),
      ],
      startTime: "09:00",
      travelModes: ["WALK"],
    });

    expect(optimized.map((place) => place.placeName)).toEqual(["near-low-score", "far-high-score"]);
    expect(optimized.map((place) => place.order)).toEqual([1, 2]);
    expect(optimized.map((place) => [place.startTime, place.endTime])).toEqual([
      ["09:10", "09:40"],
      ["10:00", "10:30"],
    ]);
    expect(optimized.map((place) => place.travelFromPrevMinutes)).toEqual([10, 20]);
    expect(optimized[0].recommendationContext).toMatchObject({
      routeDistanceMeters: 1000,
      routeDurationMinutes: 10,
      routeTravelMode: "WALK",
      sortMode: "route_optimized",
    });
    expect(requests).toHaveLength(3);
  });
});
