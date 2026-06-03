import { describe, expect, it } from "vitest";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import {
  createMapMarkerViewModels,
  createMapRoutePoints,
  createMapRouteSegments,
  createSelectedRouteSegment,
  resolveGoogleMapId,
  resolveAccommodationCoords,
} from "./map-route-view-model";

const makePlace = (override: Partial<ItineraryPlace>): ItineraryPlace => ({
  order: 1,
  placeName: "Ohori Park",
  koName: "Ohori Park",
  category: "nature",
  theme: "nature",
  description: "Park",
  startTime: "09:00",
  endTime: "10:00",
  estimatedMinutes: 60,
  estimatedCost: "0",
  travelFromPrevMinutes: 10,
  travelFromPrevDistance: "1km",
  mealSlot: "none",
  lat: 33.586,
  lng: 130.376,
  ...override,
});

describe("map route view model", () => {
  it("builds a full accommodation to ordered places to accommodation route", () => {
    const routePoints = createMapRoutePoints({
      accommodationCoords: { lat: 33.59, lng: 130.42 },
      places: [
        makePlace({ order: 2, lat: 33.595, lng: 130.41 }),
        makePlace({ order: 1, lat: 33.586, lng: 130.376 }),
      ],
    });

    expect(routePoints).toEqual([
      { kind: "accommodation", lat: 33.59, lng: 130.42 },
      { kind: "place", lat: 33.586, lng: 130.376, placeIndex: 1 },
      { kind: "place", lat: 33.595, lng: 130.41, placeIndex: 0 },
      { kind: "accommodation", lat: 33.59, lng: 130.42 },
    ]);
  });

  it("keeps only ordered place coordinates when accommodation is missing", () => {
    const routePoints = createMapRoutePoints({
      accommodationCoords: null,
      places: [
        makePlace({ order: 2, lat: 33.595, lng: 130.41 }),
        makePlace({ order: 1, lat: 33.586, lng: 130.376 }),
      ],
    });

    expect(routePoints).toEqual([
      { kind: "place", lat: 33.586, lng: 130.376, placeIndex: 1 },
      { kind: "place", lat: 33.595, lng: 130.41, placeIndex: 0 },
    ]);
  });

  it("returns only the accommodation marker point when no places exist yet", () => {
    expect(
      createMapRoutePoints({
        accommodationCoords: { lat: 33.59, lng: 130.42 },
        places: [],
      }),
    ).toEqual([{ kind: "accommodation", lat: 33.59, lng: 130.42 }]);
  });

  it("highlights the route segment entering the selected place", () => {
    const routePoints = createMapRoutePoints({
      accommodationCoords: { lat: 33.59, lng: 130.42 },
      places: [
        makePlace({ order: 2, lat: 33.595, lng: 130.41 }),
        makePlace({ order: 1, lat: 33.586, lng: 130.376 }),
      ],
    });

    expect(createSelectedRouteSegment(routePoints, 1)).toEqual([
      { kind: "accommodation", lat: 33.59, lng: 130.42 },
      { kind: "place", lat: 33.586, lng: 130.376, placeIndex: 1 },
    ]);
    expect(createSelectedRouteSegment(routePoints, 0)).toEqual([
      { kind: "place", lat: 33.586, lng: 130.376, placeIndex: 1 },
      { kind: "place", lat: 33.595, lng: 130.41, placeIndex: 0 },
    ]);
  });

  it("builds map route segments with per-leg travel time, distance, and mode metadata", () => {
    const places = [
      makePlace({
        order: 1,
        lat: 33.586,
        lng: 130.376,
        travelFromPrevDistance: "1.1km",
        travelFromPrevMinutes: 15,
        recommendationContext: {
          routeTravelMode: "WALK",
          source: "google_places",
        },
      }),
      makePlace({
        order: 2,
        lat: 33.595,
        lng: 130.41,
        travelFromPrevDistance: "2.4km",
        travelFromPrevMinutes: 18,
        recommendationContext: {
          routeTravelMode: "TRANSIT",
          returnRouteDistanceMeters: 1800,
          returnRouteDurationMinutes: 16,
          returnRouteTravelMode: "WALK",
          source: "google_places",
        },
      }),
    ];
    const routePoints = createMapRoutePoints({
      accommodationCoords: { lat: 33.59, lng: 130.42 },
      places,
    });

    expect(createMapRouteSegments(routePoints, places)).toEqual([
      {
        destination: { lat: 33.586, lng: 130.376 },
        destinationPlaceIndex: 0,
        distance: "1.1km",
        minutes: 15,
        origin: { lat: 33.59, lng: 130.42 },
        travelMode: "WALK",
      },
      {
        destination: { lat: 33.595, lng: 130.41 },
        destinationPlaceIndex: 1,
        distance: "2.4km",
        minutes: 18,
        origin: { lat: 33.586, lng: 130.376 },
        travelMode: "TRANSIT",
      },
      {
        destination: { lat: 33.59, lng: 130.42 },
        distance: "1.8km",
        minutes: 16,
        origin: { lat: 33.595, lng: 130.41 },
        travelMode: "WALK",
      },
    ]);
  });

  it("creates marker view models that match card numbers and separate accommodation styling", () => {
    const markerModels = createMapMarkerViewModels({
      accommodationCoords: { lat: 33.59, lng: 130.42 },
      places: [
        makePlace({ order: 2, category: "restaurant", mealSlot: "lunch", koName: "Local Ramen" }),
        makePlace({ order: 1, category: "nature", mealSlot: "none", koName: "Ohori Park" }),
      ],
      selectedPlaceIndex: 1,
    });

    expect(markerModels).toEqual([
      {
        id: "accommodation",
        kind: "accommodation",
        label: "?숈냼",
        position: { lat: 33.59, lng: 130.42 },
        tone: "lodging",
        title: "?숈냼",
      },
      {
        id: "place-0",
        isMeal: true,
        isSelected: false,
        kind: "place",
        markerNumber: 2,
        placeIndex: 0,
        position: { lat: 33.586, lng: 130.376 },
        title: "Local Ramen",
        tone: "meal",
      },
      {
        id: "place-1",
        isMeal: false,
        isSelected: true,
        kind: "place",
        markerNumber: 1,
        placeIndex: 1,
        position: { lat: 33.586, lng: 130.376 },
        title: "Ohori Park",
        tone: "selected",
      },
    ]);
  });

  it("resolves stored accommodation coordinates only when both numbers are finite", () => {
    expect(resolveAccommodationCoords({ accommodationLat: 33.59, accommodationLng: 130.42 })).toEqual({
      lat: 33.59,
      lng: 130.42,
    });
    expect(resolveAccommodationCoords({ accommodationLat: 33.59 })).toBeNull();
    expect(resolveAccommodationCoords({ accommodationLat: Number.NaN, accommodationLng: 130.42 })).toBeNull();
  });

  it("does not pass the demo map id into production map rendering", () => {
    expect(resolveGoogleMapId(undefined)).toBeUndefined();
    expect(resolveGoogleMapId("")).toBeUndefined();
    expect(resolveGoogleMapId("DEMO_MAP_ID")).toBeUndefined();
    expect(resolveGoogleMapId("real-map-id")).toBe("real-map-id");
  });
});
