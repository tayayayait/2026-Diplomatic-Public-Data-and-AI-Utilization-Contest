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
import { selectGoogleFirstCandidates, haversineMeters } from "./google-itinerary-scoring";
import { createGoogleFirstItineraryPlace } from "./google-first-place-builder";
import { attachAccommodationReturnRoute } from "./return-route";
import { optimizeItemsByRoute } from "./route-order-optimizer";

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
  const dep = request.departure as { lat: number; lng: number };

  // 먼 장소와 가까운 장소를 분리하여 동선 최적화
  const nearItems = selected.filter((c) => !c.isFar);
  const farItems = selected.filter((c) => c.isFar);

  // 1단계: 가까운 장소들로 기본 경로 구축 (Greedy Nearest-Neighbor)
  const orderedNear = nearItems.length > 0
    ? await optimizeItemsByRoute({
        departure: dep,
        getLocation: (candidate) => candidate.location,
        items: nearItems,
        options,
        travelModes: request.travelModes,
      })
    : [];

  // 2단계: 먼 장소를 경로의 시작 또는 끝 중 비용이 적은 위치에 삽입
  const orderedSelected = [...orderedNear];

  for (const farItem of farItems) {
    if (orderedSelected.length === 0) {
      // 가까운 장소가 없으면 먼 장소만으로 경로 생성
      const [farOrdered] = await optimizeItemsByRoute({
        departure: dep,
        getLocation: (candidate) => candidate.location,
        items: [farItem],
        options,
        travelModes: request.travelModes,
      });
      orderedSelected.push(farOrdered);
      continue;
    }

    const firstItem = orderedSelected[0];
    const lastItem = orderedSelected[orderedSelected.length - 1];
    const farLoc = farItem.location;

    // 시작에 넣을 때: 숙소→먼곳 + 먼곳→첫번째장소
    const costAtStart =
      haversineMeters(dep, farLoc) +
      haversineMeters(farLoc, firstItem.item.location);

    // 끝에 넣을 때: 마지막장소→먼곳 + 먼곳→숙소(복귀)
    const costAtEnd =
      haversineMeters(lastItem.item.location, farLoc) +
      haversineMeters(farLoc, dep);

    // 최적 위치에 삽입 + 해당 leg 경로 계산
    if (costAtStart <= costAtEnd) {
      // 시작에 삽입: 숙소→먼곳 경로
      const [farOrdered] = await optimizeItemsByRoute({
        departure: dep,
        getLocation: (candidate) => candidate.location,
        items: [farItem],
        options,
        travelModes: request.travelModes,
      });
      orderedSelected.unshift(farOrdered);
    } else {
      // 끝에 삽입: 마지막장소→먼곳 경로
      const lastLoc = lastItem.item.location;
      const [farOrdered] = await optimizeItemsByRoute({
        departure: lastLoc,
        getLocation: (candidate) => candidate.location,
        items: [farItem],
        options,
        travelModes: request.travelModes,
      });
      orderedSelected.push(farOrdered);
    }
  }
  const places: ItineraryPlace[] = [];
  let currentTime = request.startTime;
  let currentLocation: { lat: number; lng: number } = request.departure as { lat: number; lng: number };

  for (const [index, { item: candidate, leg }] of orderedSelected.entries()) {
    const result = await createGoogleFirstItineraryPlace({
      candidate,
      index,
      options,
      origin: currentLocation,
      precomputedBestRoute: leg,
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
