import { describe, expect, it } from "vitest";

import { createGoogleFirstItinerary } from "./google-first-itinerary";
import { selectBestRouteOption } from "./google-first-place-builder";
import type { TravelMode } from "./recommendation-policy";

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });

describe("Google-first itinerary engine", () => {
  it("resolves an address-only departure before collecting nearby candidates", async () => {
    const requests: Array<{ body: any; url: string }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;
      requests.push({ body, url });

      if (url.includes("places:searchText") && body.textQuery === "Watanabedori, Fukuoka") {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Watanabedori" },
              formattedAddress: "Watanabedori, Fukuoka",
              id: "departure-place",
              location: { latitude: 33.5868, longitude: 130.4017 },
            },
          ],
        });
      }

      if (url.includes("places:searchNearby") || url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Nearby Ramen" },
              formattedAddress: "1 Near St",
              location: { latitude: 33.587, longitude: 130.402 },
              primaryType: "restaurant",
              rating: 4.4,
              userRatingCount: 200,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 500, duration: "420s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    await createGoogleFirstItinerary(
      {
        city: "Fukuoka",
        country: "JP",
        departure: { address: "Watanabedori, Fukuoka" },
        durationMinutes: 180,
        startTime: "09:00",
      },
      { fetcher, googleApiKey: "google-key" },
    );

    const nearbyRequest = requests.find((request) => request.url.includes("places:searchNearby"));
    expect(nearbyRequest?.body.locationRestriction.circle.center).toEqual({
      latitude: 33.5868,
      longitude: 130.4017,
    });
  });

  it("collects Google Places candidates with an explicit departure radius and field mask", async () => {
    const requests: Array<{ body: any; headers: Headers; url: string }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const headers = new Headers(init?.headers);
      const body = init?.body ? JSON.parse(init.body.toString()) : null;
      requests.push({ body, headers, url });

      if (url.includes("places:searchNearby") || url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Hakata Local Ramen" },
              formattedAddress: "1 Ramen St, Fukuoka",
              googleMapsUri: "https://maps.google.com/?cid=ramen",
              id: "ramen-place",
              location: { latitude: 33.588, longitude: 130.402 },
              priceLevel: "PRICE_LEVEL_INEXPENSIVE",
              primaryType: "restaurant",
              rating: 4.6,
              regularOpeningHours: { openNow: true },
              userRatingCount: 900,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 850, duration: "720s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        budget: "蹂댄넻",
        city: "Fukuoka",
        country: "JP",
        departure: {
          address: "Watanabedori, Fukuoka",
          lat: 33.5868,
          lng: 130.4017,
        },
        durationMinutes: 240,
        startTime: "09:00",
      },
      { fetcher, googleApiKey: "google-key" },
    );

    const nearbyRequest = requests.find((request) => request.url.includes("places:searchNearby"));
    expect(nearbyRequest?.headers.get("X-Goog-FieldMask")).toContain("places.rating");
    expect(nearbyRequest?.body).toMatchObject({
      includedTypes: ["restaurant"],
      languageCode: "ko",
      locationRestriction: {
        circle: {
          center: { latitude: 33.5868, longitude: 130.4017 },
          radius: 50000,
        },
      },
      maxResultCount: 10,
      rankPreference: "POPULARITY",
    });
    expect(places[0]).toMatchObject({
      category: "restaurant",
      estimatedCost: "Google 媛寃⑸?: ???",
      estimatedMinutes: 75,
      koName: "Hakata Local Ramen",
      mealSlot: "meal",
      order: 1,
      placeIntroduction: "Gemini ?μ냼 ?뚭컻瑜??앹꽦?섏? 紐삵뻽?듬땲??",
      placeName: "Hakata Local Ramen",
      travelFromPrevMinutes: 12,
      travelFromPrevDistance: "850m",
    });
    expect(places[0].recommendationContext).toMatchObject({
      businessStatus: "OPERATIONAL",
      distanceFromDepartureMeters: expect.any(Number),
      matchedPreference: "?꾩? 濡쒖뺄 留쏆쭛",
      openingNow: true,
      preferenceKind: "food",
      priceLevel: "PRICE_LEVEL_INEXPENSIVE",
      rating: 4.6,
      returnRouteDistanceMeters: 850,
      returnRouteDurationMinutes: 12,
      returnRouteTravelMode: "WALK",
      routeDistanceMeters: 850,
      routeDurationMinutes: 12,
      score: expect.any(Number),
      searchRadiusMeters: 50000,
      sortMode: "route_optimized",
    });
  });

  it("excludes places from the previous recommendation by place id and name", async () => {
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("places:searchNearby") || url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Previous Landmark By Id" },
              id: "previous-place-id",
              location: { latitude: 33.587, longitude: 130.402 },
              primaryType: "tourist_attraction",
              rating: 5,
              userRatingCount: 10000,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Previous Landmark By Name" },
              location: { latitude: 33.588, longitude: 130.403 },
              primaryType: "tourist_attraction",
              rating: 4.9,
              userRatingCount: 9000,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Fresh Garden" },
              id: "fresh-garden-id",
              location: { latitude: 33.589, longitude: 130.404 },
              primaryType: "park",
              rating: 4.1,
              userRatingCount: 200,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 400, duration: "360s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 60,
        excludedGooglePlaceIds: ["previous-place-id"],
        excludedPlaceNames: ["Previous Landmark By Name"],
        startTime: "10:00",
      },
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.map((place) => place.placeName)).toEqual(["Fresh Garden"]);
  });

  it("excludes similar multilingual place names from previous days", async () => {
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("places:searchNearby") || url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Fukuoka nakasu Food Stalls Street" },
              id: "nakasu-yatai-en",
              location: { latitude: 33.592, longitude: 130.405 },
              primaryType: "tourist_attraction",
              rating: 4.9,
              userRatingCount: 5000,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Ohori Park" },
              id: "ohori-park-id",
              location: { latitude: 33.586, longitude: 130.376 },
              primaryType: "park",
              rating: 4.4,
              userRatingCount: 2000,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 400, duration: "360s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 120,
        excludedGooglePlaceIds: [],
        excludedPlaceNames: ["\uB098\uCE74\uC2A4 \uD3EC\uC7A5\uB9C8\uCC28 \uAC70\uB9AC"],
        startTime: "10:00",
      },
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.map((place) => place.placeName)).toEqual(["Ohori Park"]);
  });

  it("filters unusable candidates and schedules attractions before lunch with cumulative times", async () => {
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;

      if (url.includes("places:searchNearby") && body.includedTypes.includes("restaurant")) {
        return okJson({
          places: [
            {
              businessStatus: "CLOSED_PERMANENTLY",
              displayName: { text: "Closed Ramen" },
              location: { latitude: 33.589, longitude: 130.41 },
              primaryType: "restaurant",
              rating: 4.9,
              userRatingCount: 2000,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Nearby Ramen" },
              formattedAddress: "1 Near St",
              location: { latitude: 33.587, longitude: 130.402 },
              primaryType: "restaurant",
              rating: 4.4,
              userRatingCount: 200,
            },
          ],
        });
      }

      if (url.includes("places:searchNearby")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Far Art Museum" },
              formattedAddress: "9 Far St",
              location: { latitude: 33.6, longitude: 130.43 },
              primaryType: "museum",
              rating: 4.8,
              userRatingCount: 1400,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 1000, duration: "600s" }],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 1000, duration: "600s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 360,
        startTime: "09:00",
      },
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.map((place) => place.placeName)).toEqual(["Far Art Museum", "Nearby Ramen"]);
    expect(places.map((place) => [place.startTime, place.endTime])).toEqual([
      ["09:10", "10:40"],
      ["10:50", "12:05"],
    ]);
    expect(places.map((place) => place.estimatedMinutes)).toEqual([90, 75]);
    expect(places[1].description).toContain("痍⑦뼢");
    expect(places[1].description).toContain("?됱젏 4.4");
    expect(places[1].description).not.toContain("Closed Ramen");
  });

  it("filters out lodging/hotel place types completely from candidates", async () => {
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("places:searchNearby") || url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Grand Hotel" },
              id: "grand-hotel",
              location: { latitude: 33.587, longitude: 130.402 },
              primaryType: "hotel",
              rating: 4.8,
              userRatingCount: 1000,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Nearby Cafe" },
              id: "nearby-cafe",
              location: { latitude: 33.588, longitude: 130.403 },
              primaryType: "cafe",
              rating: 4.5,
              userRatingCount: 500,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 400, duration: "360s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 60,
        startTime: "10:00",
      },
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places.length).toBeGreaterThan(0);
    expect(places.some((p) => p.placeName === "Grand Hotel")).toBe(false);
    expect(places[0].placeName).toBe("Nearby Cafe");
    expect(places[0].mealSlot).toBe("snack");
  });

  it("labels a restaurant stop as a general meal regardless of arrival time", async () => {
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("places:searchNearby")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Late Ramen" },
              formattedAddress: "7 Dinner St",
              location: { latitude: 33.587, longitude: 130.402 },
              primaryType: "restaurant",
              rating: 4.3,
              userRatingCount: 7619,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 1100, duration: "1440s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 180,
        startTime: "14:59",
      },
      { fetcher, googleApiKey: "google-key" },
    );

    expect(places[0]).toMatchObject({
      mealSlot: "meal",
      placeName: "Late Ramen",
      startTime: "15:23",
    });
  });

  it("chooses the travel mode from actual previous-place route durations", async () => {
    const requests: Array<{ body: any; url: string }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;
      requests.push({ body, url });

      if (url.includes("places:searchNearby")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "First Museum" },
              formattedAddress: "1 Museum St",
              id: "first-museum",
              location: { latitude: 33.6, longitude: 130.42 },
              primaryType: "museum",
              rating: 4.7,
              userRatingCount: 600,
            },
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Nearby Gallery" },
              formattedAddress: "2 Gallery St",
              id: "nearby-gallery",
              location: { latitude: 33.6005, longitude: 130.4205 },
              primaryType: "museum",
              rating: 4.6,
              userRatingCount: 500,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        const origin = body.origin.location.latLng;
        const destination = body.destination.location.latLng;
        const isSecondLeg =
          Math.abs(origin.latitude - 33.6) < 0.0001 &&
          Math.abs(destination.latitude - 33.6005) < 0.0001;

        if (isSecondLeg && body.travelMode === "WALK") {
          return okJson({ routes: [{ distanceMeters: 280, duration: "240s" }] });
        }

        if (isSecondLeg && body.travelMode === "TRANSIT") {
          return okJson({ routes: [{ distanceMeters: 900, duration: "600s" }] });
        }

        if (body.travelMode === "WALK") {
          return okJson({ routes: [{ distanceMeters: 2600, duration: "2100s" }] });
        }

        return okJson({ routes: [{ distanceMeters: 3200, duration: "900s" }] });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 240,
        startTime: "09:00",
        travelModes: ["WALK", "TRANSIT"],
      },
      { fetcher, googleApiKey: "google-key" },
    );

    const routeRequests = requests.filter((request) =>
      request.url.includes("directions/v2:computeRoutes"),
    );
    const secondLegModes = routeRequests
      .filter(
        (request) =>
          Math.abs(request.body.origin.location.latLng.latitude - 33.6) < 0.0001 &&
          Math.abs(request.body.destination.location.latLng.latitude - 33.6005) < 0.0001,
      )
      .map((request) => request.body.travelMode)
      .sort();

    expect(secondLegModes).toEqual(["TRANSIT", "WALK"]);
    expect(places[0].travelMode).toBe("?以묎탳??)";
    expect(places[1]).toMatchObject({
      placeName: "Nearby Gallery",
      travelFromPrevDistance: "280m",
      travelFromPrevMinutes: 4,
      travelMode: "?꾨낫",
    });
    expect(places[1].recommendationContext).toMatchObject({
      routeDistanceMeters: 280,
      routeDurationMinutes: 4,
      routeTravelMode: "WALK",
    });
  });

  it("keeps the selected travel mode in search radius, route requests, and recommendation context", async () => {
    const requests: Array<{ body: any; url: string }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;
      requests.push({ body, url });

      if (url.includes("places:searchNearby")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Transit Museum" },
              formattedAddress: "9 Transit St",
              location: { latitude: 33.61, longitude: 130.43 },
              primaryType: "museum",
              rating: 4.7,
              userRatingCount: 500,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        return okJson({
          routes: [{ distanceMeters: 4200, duration: "1080s" }],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 180,
        startTime: "10:00",
        travelModes: ["TRANSIT"],
      },
      { fetcher, googleApiKey: "google-key" },
    );

    const nearbyRequest = requests.find((request) => request.url.includes("places:searchNearby"));
    const routeRequest = requests.find((request) => request.url.includes("directions/v2:computeRoutes"));

    expect(nearbyRequest?.body.locationRestriction.circle.radius).toBe(50000);
    expect(routeRequest?.body.travelMode).toBe("TRANSIT");
    expect(places[0].travelMode).toBe("?以묎탳??)";
    expect(places[0].description).toContain("?꾩떆? 吏??臾명솕瑜?)";
    expect(places[0].description).toContain("?꾩? 濡쒖뺄 留쏆쭛");
    expect(places[0].recommendationContext).toMatchObject({
      travelModes: ["TRANSIT"],
    });
  });

  it("prefers walking for short legs even when another selected mode is slightly faster", async () => {
    const requests: Array<{ body: any; url: string }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = init?.body ? JSON.parse(init.body.toString()) : null;
      requests.push({ body, url });

      if (url.includes("places:searchNearby") || url.includes("places:searchText")) {
        return okJson({
          places: [
            {
              businessStatus: "OPERATIONAL",
              displayName: { text: "Nearby Garden" },
              formattedAddress: "1 Garden St",
              id: "nearby-garden",
              location: { latitude: 33.589, longitude: 130.404 },
              primaryType: "park",
              rating: 4.5,
              userRatingCount: 700,
            },
          ],
        });
      }

      if (url.includes("directions/v2:computeRoutes")) {
        if (body.travelMode === "WALK") {
          return okJson({ routes: [{ distanceMeters: 850, duration: "780s" }] });
        }

        return okJson({ routes: [{ distanceMeters: 1200, duration: "420s" }] });
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const places = await createGoogleFirstItinerary(
      {
        country: "JP",
        departure: { lat: 33.5868, lng: 130.4017 },
        durationMinutes: 180,
        startTime: "09:00",
        travelModes: ["WALK", "TRANSIT"],
      },
      { fetcher, googleApiKey: "google-key" },
    );

    const routeModes = requests
      .filter((request) => request.url.includes("directions/v2:computeRoutes"))
      .filter(
        (request) =>
          Math.abs(request.body.origin.location.latLng.latitude - 33.5868) < 0.0001 &&
          Math.abs(request.body.destination.location.latLng.latitude - 33.589) < 0.0001,
      )
      .map((request) => request.body.travelMode)
      .sort();

    expect(routeModes).toEqual(["TRANSIT", "WALK"]);
    expect(places[0]).toMatchObject({
      placeName: "Nearby Garden",
      travelFromPrevDistance: "850m",
      travelFromPrevMinutes: 13,
    });
    expect(places[0].recommendationContext).toMatchObject({
      routeDistanceMeters: 850,
      routeDurationMinutes: 13,
      routeTravelMode: "WALK",
      travelModes: ["WALK", "TRANSIT"],
    });
  });
});

describe("selectBestRouteOption ???대룞?섎떒蹂??쒓컙 ?꾧퀎媛?, () => {"
  it("?먯쟾嫄곌? ?以묎탳?듬낫??鍮좊Ⅴ?붾씪?? ?먯쟾嫄??꾧퀎媛?20遺???珥덇낵?섎㈃ ?以묎탳?듭씠 ?좏깮?쒕떎", () => {
    const options = [
      { mode: "WALK" as TravelMode, route: { distanceMeters: 15000, durationMinutes: 130 } },
      // ?以묎탳?듭? 40遺?(?꾧퀎媛?60遺??대궡)
      { mode: "TRANSIT" as TravelMode, route: { distanceMeters: 12000, durationMinutes: 40 } },
      // ?먯쟾嫄곕뒗 30遺꾩쑝濡??以묎탳?듬낫??鍮좊Ⅴ吏留??꾧퀎媛?20遺???珥덇낵??      { mode: "BICYCLE" as TravelMode, route: { distanceMeters: 14000, durationMinutes: 30 } },
    ];
    const result = selectBestRouteOption(options);
    expect(result.mode).toBe("TRANSIT");
    expect(result.route.durationMinutes).toBe(40);
  });

  it("紐⑤뱺 ?대룞?섎떒???꾧퀎媛?珥덇낵 ?? 洹?以?理쒕떒 ?쒓컙???좏깮?쒕떎", () => {
    const options = [
      { mode: "WALK" as TravelMode, route: { distanceMeters: 20000, durationMinutes: 250 } },
      { mode: "BICYCLE" as TravelMode, route: { distanceMeters: 18000, durationMinutes: 80 } },
    ];
    const result = selectBestRouteOption(options);
    expect(result.mode).toBe("BICYCLE");
    expect(result.route.durationMinutes).toBe(80);
  });

  it("?꾨낫 ?곗꽑 議곌굔(1.2km/20遺?? ?꾧퀎媛믩낫???곗꽑 ?곸슜?쒕떎", () => {
    const options = [
      { mode: "WALK" as TravelMode, route: { distanceMeters: 800, durationMinutes: 12 } },
      { mode: "TRANSIT" as TravelMode, route: { distanceMeters: 1200, durationMinutes: 8 } },
    ];
    const result = selectBestRouteOption(options);
    expect(result.mode).toBe("WALK");
  });
});
