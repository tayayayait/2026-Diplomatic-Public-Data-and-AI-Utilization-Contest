import type { ItineraryPlace } from "@/lib/gemini/schema";

import {
  getRadiusPolicyForTravelModes,
  localItineraryRecommendationRequestSchema,
} from "./recommendation-policy";
import {
  collectGooglePlaceCandidates,
  type GoogleFirstItineraryOptions,
} from "./google-place-candidates";
import { resolveGooglePlaceLocation } from "./google-places-api";
import { selectGoogleFirstCandidates } from "./google-itinerary-scoring";
import { createGoogleFirstItineraryPlace } from "./google-first-place-builder";
import { attachAccommodationReturnRoute } from "./return-route";

const hasFiniteDepartureCoordinates = (departure: { lat?: number; lng?: number }) =>
  Number.isFinite(departure.lat) && Number.isFinite(departure.lng);

const resolveDeparture = async (
  rawRequest: ReturnType<typeof localItineraryRecommendationRequestSchema.parse>,
  options: GoogleFirstItineraryOptions,
) => {
  if (hasFiniteDepartureCoordinates(rawRequest.departure)) {
    return rawRequest;
  }

  const address = rawRequest.departure.address?.trim();
  if (!address) return null;

  const resolved = await resolveGooglePlaceLocation(address, options);
  if (!resolved) return null;

  return {
    ...rawRequest,
    departure: {
      address: resolved.address,
      lat: resolved.lat,
      lng: resolved.lng,
    },
  };
};

const applyEffectiveSearchRadius = (
  request: ReturnType<typeof localItineraryRecommendationRequestSchema.parse>,
) => {
  const radiusPolicy = getRadiusPolicyForTravelModes(request.travelModes);

  return {
    ...request,
    searchRadiusMeters: request.searchRadiusMeters ?? radiusPolicy.default,
  };
};

export const createGoogleFirstItinerary = async (
  rawRequest: unknown,
  options: GoogleFirstItineraryOptions,
): Promise<ItineraryPlace[]> => {
  const parsedRequest = localItineraryRecommendationRequestSchema.parse(rawRequest);
  const resolvedRequest = await resolveDeparture(parsedRequest, options);

  if (!resolvedRequest) return [];

  const request = applyEffectiveSearchRadius(resolvedRequest);
  const candidates = await collectGooglePlaceCandidates(request, options);
  const selected = selectGoogleFirstCandidates(request, candidates);
  const places: ItineraryPlace[] = [];
  let currentTime = request.startTime;
  let currentLocation: { lat: number; lng: number } = request.departure as { lat: number; lng: number };

  for (const [index, candidate] of selected.entries()) {
    const result = await createGoogleFirstItineraryPlace({
      candidate,
      index,
      options,
      origin: currentLocation,
      request,
      startTime: currentTime,
    });
    places.push(result.place);
    currentTime = result.nextStartTime;
    currentLocation = candidate.location;
  }

  return attachAccommodationReturnRoute({
    departure: request.departure as { lat: number; lng: number },
    options,
    places,
    returnOrigin: currentLocation,
    travelModes: request.travelModes,
  });
};
