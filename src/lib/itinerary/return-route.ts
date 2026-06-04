import type { ItineraryPlace } from "@/lib/gemini/schema";

import type { GoogleFirstItineraryOptions } from "./google-place-candidates";
import { computeRoute } from "./google-routes-api";
import { selectBestRouteOption } from "./google-first-place-builder";
import type { TravelMode } from "./recommendation-policy";

const uniqueTravelModes = (allowedModes: TravelMode[]) =>
  [...new Set(allowedModes.length > 0 ? allowedModes : ["WALK"])] as TravelMode[];

const computeBestReturnRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options: GoogleFirstItineraryOptions,
  allowedModes: TravelMode[],
) => {
  const routeOptions = await Promise.all(
    uniqueTravelModes(allowedModes).map(async (mode) => ({
      mode,
      route: await computeRoute(origin, destination, { ...options, travelMode: mode }),
    })),
  );

  return selectBestRouteOption(routeOptions);
};

export const attachAccommodationReturnRoute = async ({
  departure,
  options,
  places,
  returnOrigin,
  travelModes,
}: {
  departure: { lat: number; lng: number };
  options: GoogleFirstItineraryOptions;
  places: ItineraryPlace[];
  returnOrigin: { lat: number; lng: number };
  travelModes: TravelMode[];
}): Promise<ItineraryPlace[]> => {
  if (places.length === 0) return places;

  const bestReturnRoute = await computeBestReturnRoute(
    returnOrigin,
    departure,
    options,
    travelModes,
  );

  if (bestReturnRoute.route.durationMinutes <= 0) return places;

  const lastIndex = places.length - 1;

  return places.map((place, index) => {
    if (index !== lastIndex || !place.recommendationContext) return place;

    return {
      ...place,
      recommendationContext: {
        ...place.recommendationContext,
        returnRouteDistanceMeters: bestReturnRoute.route.distanceMeters,
        returnRouteDurationMinutes: bestReturnRoute.route.durationMinutes,
        returnRouteTravelMode: bestReturnRoute.mode,
      },
    };
  });
};
