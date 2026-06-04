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
    expect(model.sortLabel).toContain("경로 효율성");
    expect(model.signalLabels).toEqual([
      "경로 효율성 30점",
      "Google 평점/리뷰 40점",
      "영업시간 적합도 15점",
      "예산 적합도 10점",
      "카테고리 다양성 5점",
    ]);
    expect(model.exclusionLabel).toBe("지원되지 않는 도시, 좌표가 누락되거나 이용할 수 없는 장소 후보를 제외합니다.");
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

    expect(model.sourceLabel).toBe("Gemini 대체 추천");
    expect(model.dataBasisLabel).toBe("Google 장소 세부 정보를 사용할 수 없어 AI가 생성한 대체 추천입니다.");
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
      "취향: ?꾩? 濡쒖뺄 留쏆쭛",
      "출발지에서 850m",
      "평점 4.6",
      "리뷰 900개",
      "현재 영업 중",
      "가격대 저렴함",
      "점수 87.3점",
    ]);
  });
});
