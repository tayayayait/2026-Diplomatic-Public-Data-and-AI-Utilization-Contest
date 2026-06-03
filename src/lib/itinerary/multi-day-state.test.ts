import { describe, expect, it } from "vitest";
import type { UserProfile } from "@/lib/diplolife/state";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import { createItineraryStoreSeed } from "./multi-day-state";

const profile: UserProfile = {
  id: "user_1",
  name: "traveler",
  country: "JP",
  city: "Fukuoka",
  visaType: "TOURIST",
  stayPurpose: "TRAVEL",
  stayStartDate: "2026-06-01",
  stayEndDate: "2026-06-03",
  interests: ["SAFETY"],
  onboardingComplete: true,
  notificationSettings: {
    aiInsight: true,
    exchangeRate: true,
    notices: true,
    safety: true,
    visa: true,
    weather: true,
  },
  theme: "system",
  language: "ko",
};

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

describe("multi-day itinerary state seed", () => {
  it("creates a store seed from a generated one-day itinerary and profile date range", () => {
    const seed = createItineraryStoreSeed({
      places: [
        makePlace({ order: 2, placeName: "Kushida Shrine", koName: "Kushida Shrine", lat: 33.593, lng: 130.41 }),
        makePlace({ order: 1, placeName: "Ohori Park", koName: "Ohori Park", lat: 33.586, lng: 130.376 }),
      ],
      profile,
    });

    expect(seed.startDate).toBe("2026-06-01");
    expect(seed.endDate).toBe("2026-06-03");
    expect(seed.durationDays).toBe(3);
    expect(seed.globalPlaces.map((place) => place.name)).toEqual(["Ohori Park", "Kushida Shrine"]);
    expect(seed.generatedDays).toHaveLength(1);
    expect(seed.generatedDays[0].dayIndex).toBe(1);
    expect(seed.generatedDays[0].slots.map((slot) => slot.place?.name)).toEqual(["Ohori Park", "Kushida Shrine"]);
    expect(seed.generatedDays[0].slots[0]).toMatchObject({
      endTime: "10:00",
      slotType: "optional",
      startTime: "09:00",
    });
  });

  it("creates generated days for every generated day-place group", () => {
    const seed = createItineraryStoreSeed({
      placesByDay: [
        {
          dayIndex: 1,
          places: [
            makePlace({
              googlePlaceId: "day-1-place",
              order: 1,
              placeName: "Day 1 Park",
              koName: "Day 1 Park",
            }),
          ],
        },
        {
          dayIndex: 2,
          places: [
            makePlace({
              googlePlaceId: "day-2-place",
              order: 1,
              placeName: "Day 2 Museum",
              koName: "Day 2 Museum",
              category: "culture",
            }),
          ],
        },
      ],
      profile,
    });

    expect(seed.globalPlaces.map((place) => place.name)).toEqual(["Day 1 Park", "Day 2 Museum"]);
    expect(seed.globalPlaces.map((place) => place.id)).toEqual([
      "generated-day-1-1-0",
      "generated-day-2-1-0",
    ]);
    expect(seed.generatedDays.map((day) => day.dayIndex)).toEqual([1, 2]);
    expect(seed.generatedDays[0].slots[0].place?.name).toBe("Day 1 Park");
    expect(seed.generatedDays[1].slots[0].place?.name).toBe("Day 2 Museum");
    expect(seed.generatedDays[1].slots[0].itineraryPlace?.googlePlaceId).toBe("day-2-place");
  });

  it("falls back to a one-day range when profile dates are missing or invalid", () => {
    const seed = createItineraryStoreSeed({
      fallbackStartDate: "2026-07-10",
      places: [makePlace({})],
      profile: {
        ...profile,
        stayStartDate: "invalid",
        stayEndDate: "2026-01-01",
      },
    });

    expect(seed.startDate).toBe("2026-07-10");
    expect(seed.endDate).toBe("2026-07-10");
    expect(seed.durationDays).toBe(1);
  });
});
