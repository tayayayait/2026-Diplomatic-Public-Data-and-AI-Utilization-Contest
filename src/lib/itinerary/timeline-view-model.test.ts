import { describe, expect, it } from "vitest";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import {
  createReturnHomeStep,
  createTimelinePlaceViewModels,
  getCategoryLabel,
  getMealSlotLabel,
} from "./timeline-view-model";

const makePlace = (override: Partial<ItineraryPlace>): ItineraryPlace => ({
  order: 1,
  placeName: "Ohori Park",
  koName: "오호리 공원",
  category: "nature",
  theme: "자연",
  placeIntroduction:
    "오호리 공원은 큰 연못과 산책로가 있는 후쿠오카의 대표 공원입니다. 도심 일정 중 자연 속에서 쉬어가기 좋은 장소입니다.",
  description: "산책하기 좋은 공원입니다.",
  startTime: "09:15",
  endTime: "10:30",
  estimatedMinutes: 75,
  estimatedCost: "무료",
  travelFromPrevMinutes: 15,
  travelFromPrevDistance: "1.2km, 도보 15분",
  mealSlot: "none",
  lat: 33.586,
  lng: 130.376,
  ...override,
});

describe("timeline view model", () => {
  it("sorts itinerary places by order and formats time ranges", () => {
    const models = createTimelinePlaceViewModels([
      makePlace({ order: 2, koName: "구시다 신사", startTime: "10:45", endTime: "11:30" }),
      makePlace({ order: 1, koName: "오호리 공원", startTime: "09:15", endTime: "10:30" }),
    ]);

    expect(models.map((model) => model.title)).toEqual(["오호리 공원", "구시다 신사"]);
    expect(models[0].timeRange).toBe("09:15-10:30");
    expect(models[0].placeIntroduction).toContain("대표 공원");
  });

  it("keeps the original place index for map selection after sorting", () => {
    const models = createTimelinePlaceViewModels([
      makePlace({ order: 2, koName: "구시다 신사" }),
      makePlace({ order: 1, koName: "오호리 공원" }),
    ]);

    expect(models.map((model) => model.index)).toEqual([1, 0]);
  });

  it("uses Korean meal and category labels", () => {
    expect(getMealSlotLabel("breakfast")).toBe("식사");
    expect(getMealSlotLabel("lunch")).toBe("식사");
    expect(getMealSlotLabel("dinner")).toBe("식사");
    expect(getMealSlotLabel("snack")).toBe("식사");
    expect(getMealSlotLabel("meal")).toBe("식사");
    expect(getMealSlotLabel("none")).toBe("일반 일정");
    expect(getCategoryLabel("culture")).toBe("문화");
    expect(getCategoryLabel("restaurant")).toBe("식사");
  });

  it("falls back when legacy places do not have a place introduction", () => {
    const [model] = createTimelinePlaceViewModels([
      makePlace({
        placeIntroduction: "",
      }),
    ]);

    expect(model.placeIntroduction).toBe("장소 소개 정보 없음");
  });

  it("does not fabricate return travel time for the final home step", () => {
    expect(createReturnHomeStep()).toEqual({
      description: "오늘 일정을 마칩니다",
      title: "숙소 복귀",
    });
  });

  it("formats the accommodation return route without a fixed return time window", () => {
    const returnStep = createReturnHomeStep([
      makePlace({
        endTime: "20:10",
        recommendationContext: {
          returnRouteDistanceMeters: 1250,
          returnRouteDurationMinutes: 18,
          returnRouteTravelMode: "WALK",
          source: "google_places",
        },
      }),
    ]);

    expect(returnStep.title).toBe("숙소 복귀");
    expect(returnStep.description).not.toContain("20:10");
    expect(returnStep.description).not.toContain("20:28");
    expect(returnStep.description).toContain("18분");
    expect(returnStep.description).toContain("1.3km");
  });
});

