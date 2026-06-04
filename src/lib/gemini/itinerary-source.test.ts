import { describe, expect, it, vi } from "vitest";

import type { ItineraryPlace } from "./schema";
import { generateItineraryOnServer } from "./itinerary";

const googlePlace: ItineraryPlace = {
  category: "restaurant",
  description: "Google Places 湲곕컲 異붿쿇",
  endTime: "10:30",
  estimatedCost: "Google 媛寃⑸?: ???",
  estimatedMinutes: 75,
  koName: "Hakata Local Ramen",
  lat: 33.588,
  lng: 130.402,
  mealSlot: "lunch",
  order: 1,
  placeIntroduction: "Gemini ?μ냼 ?뚭컻瑜??앹꽦?섏? 紐삵뻽?듬땲??",
  placeName: "Hakata Local Ramen",
  startTime: "09:15",
  theme: "?꾩? 濡쒖뺄 留쏆쭛",
  travelFromPrevDistance: "850m",
  travelFromPrevMinutes: 12,
};

const geminiPlace: ItineraryPlace = {
  ...googlePlace,
  description: "Gemini fallback 異붿쿇",
  placeIntroduction: "Gemini媛 ?묒꽦???μ냼 ?뚭컻",
  placeName: "Gemini Place",
};

const categorySequenceByCount: Record<number, ItineraryPlace["category"][]> = {
  2: ["restaurant", "attraction"],
  3: ["restaurant", "attraction", "culture"],
  4: ["restaurant", "cafe", "attraction", "culture"],
  5: ["restaurant", "cafe", "attraction", "culture", "shopping"],
  6: ["restaurant", "cafe", "attraction", "culture", "shopping", "nature"],
  7: ["restaurant", "cafe", "attraction", "culture", "shopping", "nature", "restaurant"],
};

const makePlaces = (count: number, prefix: string): ItineraryPlace[] =>
  Array.from({ length: count }, (_, index) =>
    makeTypedPlace(
      `${prefix} Place ${index + 1}`,
      categorySequenceByCount[count]?.[index] ?? "attraction",
      index + 1,
    ),
  );

const makeTypedPlace = (
  placeName: string,
  category: ItineraryPlace["category"],
  order: number,
): ItineraryPlace => ({
  ...googlePlace,
  category,
  googlePlaceId: `${placeName.toLowerCase().replaceAll(" ", "-")}-id`,
  koName: placeName,
  mealSlot: category === "restaurant" ? "meal" : category === "cafe" ? "snack" : "none",
  order,
  placeName,
});

const input = {
  accommodationAddress: "Watanabedori, Fukuoka",
  accommodationLat: 33.5868,
  accommodationLng: 130.4017,
  budget: "蹂댄넻",
  budgetPlan: {
    dailyBudgetKrw: 72727,
    dailyLocalBudget: {
      accommodation: 3800,
      activity: 659,
      food: 2500,
      total: 7660,
      transport: 700,
    },
    stayDays: 11,
    strategy: "balanced" as const,
    targetCurrency: "JPY",
    totalBudgetKrw: 800000,
  },
  city: "Fukuoka",
  country: "JP",
  durationMinutes: 240,
  startTime: "09:00",
  travelModes: ["WALK"] as ("WALK" | "TRANSIT" | "BICYCLE" | "DRIVE")[],
  excludedGooglePlaceIds: [],
  excludedPlaceNames: [],
};

describe("itinerary generation source selection", () => {
  it("uses Gemini-guided Google Places matching when both Gemini and Google keys exist", async () => {
    const guidedPlaces = makePlaces(5, "Guided");
    const normalIntensityInput = { ...input, targetPlaceCount: 5 };
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue([googlePlace]);
    const generateGeminiItinerary = vi.fn().mockResolvedValue([geminiPlace]);
    const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue(guidedPlaces);

    const result = await generateItineraryOnServer(normalIntensityInput, {
      config: {
        geminiApiKey: "gemini-key",
        googlePlacesApiKey: "google-key",
      },
      createGoogleFirstItinerary,
      createGeminiGuidedGoogleItinerary,
      generateGeminiItinerary,
    } as any);

    expect(result).toEqual(guidedPlaces);
    expect(generateGeminiItinerary).toHaveBeenCalledWith(
      expect.objectContaining(normalIntensityInput),
      "gemini-key",
    );
    expect(createGeminiGuidedGoogleItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        departure: {
          address: "Watanabedori, Fukuoka",
          lat: 33.5868,
          lng: 130.4017,
        },
        budgetPlan: expect.objectContaining({
          dailyBudgetKrw: 72727,
          strategy: "balanced",
          totalBudgetKrw: 800000,
        }),
        searchRadiusMeters: 50000,
        sortMode: "route_optimized",
        targetPlaceCount: 5,
      }),
      [geminiPlace],
      expect.objectContaining({ googleApiKey: "google-key" }),
    );
    expect(createGoogleFirstItinerary).not.toHaveBeenCalled();
  });

  it("passes a travel-mode-specific search radius into Gemini-guided Google matching", async () => {
    const guidedPlaces = makePlaces(5, "Guided");
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue([googlePlace]);
    const generateGeminiItinerary = vi.fn().mockResolvedValue([geminiPlace]);
    const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue(guidedPlaces);

    await generateItineraryOnServer(
      {
        ...input,
        targetPlaceCount: 5,
        travelModes: ["TRANSIT"] as ("WALK" | "TRANSIT" | "BICYCLE" | "DRIVE")[],
      },
      {
        config: {
          geminiApiKey: "gemini-key",
          googlePlacesApiKey: "google-key",
        },
        createGoogleFirstItinerary,
        createGeminiGuidedGoogleItinerary,
        generateGeminiItinerary,
      } as any,
    );

    expect(createGeminiGuidedGoogleItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        searchRadiusMeters: 50000,
        targetPlaceCount: 5,
        travelModes: ["TRANSIT"],
      }),
      [geminiPlace],
      expect.objectContaining({ googleApiKey: "google-key" }),
    );
    expect(createGoogleFirstItinerary).not.toHaveBeenCalled();
  });

  it("passes previous recommendation exclusions into Gemini-guided Google matching", async () => {
    const guidedPlaces = makePlaces(5, "Guided");
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue([googlePlace]);
    const generateGeminiItinerary = vi.fn().mockResolvedValue([geminiPlace]);
    const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue(guidedPlaces);

    await generateItineraryOnServer(
      {
        ...input,
        excludedGooglePlaceIds: ["old-google-id"],
        excludedPlaceNames: ["Old Landmark"],
        targetPlaceCount: 5,
      },
      {
        config: {
          geminiApiKey: "gemini-key",
          googlePlacesApiKey: "google-key",
        },
        createGoogleFirstItinerary,
        createGeminiGuidedGoogleItinerary,
        generateGeminiItinerary,
      } as any,
    );

    expect(createGeminiGuidedGoogleItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        excludedGooglePlaceIds: ["old-google-id"],
        excludedPlaceNames: ["Old Landmark"],
        targetPlaceCount: 5,
      }),
      [geminiPlace],
      expect.objectContaining({ googleApiKey: "google-key" }),
    );
    expect(createGoogleFirstItinerary).not.toHaveBeenCalled();
  });


  it("falls back to Gemini generation when Google Places key is missing", async () => {
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue([googlePlace]);
    const generateGeminiItinerary = vi.fn().mockResolvedValue([geminiPlace]);

    const result = await generateItineraryOnServer(input, {
      config: {
        geminiApiKey: "gemini-key",
        googlePlacesApiKey: undefined,
      },
      createGoogleFirstItinerary,
      generateGeminiItinerary,
    });

    expect(result).toEqual([
      expect.objectContaining({
        placeName: "Gemini Place",
        recommendationContext: expect.objectContaining({
          searchRadiusMeters: 50000,
          sortMode: "route_optimized",
          source: "gemini",
        }),
      }),
    ]);
    expect(createGoogleFirstItinerary).not.toHaveBeenCalled();
  });

  it("uses Gemini-guided Google matching for address-only departures when both keys exist", async () => {
    const guidedPlaces = makePlaces(5, "Guided");
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue([googlePlace]);
    const generateGeminiItinerary = vi.fn().mockResolvedValue([geminiPlace]);
    const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue(guidedPlaces);

    const result = await generateItineraryOnServer(
      {
        ...input,
        accommodationLat: undefined,
        accommodationLng: undefined,
        targetPlaceCount: 5,
      },
      {
        config: {
          geminiApiKey: "gemini-key",
          googlePlacesApiKey: "google-key",
        },
        createGoogleFirstItinerary,
        createGeminiGuidedGoogleItinerary,
        generateGeminiItinerary,
      } as any,
    );

    expect(result).toEqual(guidedPlaces);
    expect(generateGeminiItinerary).toHaveBeenCalledTimes(1);
    expect(createGeminiGuidedGoogleItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        departure: {
          address: "Watanabedori, Fukuoka",
          lat: undefined,
          lng: undefined,
        },
        targetPlaceCount: 5,
      }),
      [geminiPlace],
      expect.objectContaining({ googleApiKey: "google-key" }),
    );
    expect(createGoogleFirstItinerary).not.toHaveBeenCalled();
  });

  it.each([
    { targetPlaceCount: 3, underfilledCount: 2 },
    { targetPlaceCount: 5, underfilledCount: 4 },
    { targetPlaceCount: 7, underfilledCount: 6 },
  ])(
    "does not accept underfilled Gemini-guided results for a $targetPlaceCount-place intensity target",
    async ({ targetPlaceCount, underfilledCount }) => {
      const guidedPlaces = makePlaces(underfilledCount, `Guided ${targetPlaceCount}`);
      const googleFirstPlaces = makePlaces(targetPlaceCount, `Google ${targetPlaceCount}`);
      const createGoogleFirstItinerary = vi.fn().mockResolvedValue(googleFirstPlaces);
      const generateGeminiItinerary = vi.fn().mockResolvedValue(makePlaces(targetPlaceCount, "Gemini Draft"));
      const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue(guidedPlaces);
      const generateGeminiPlaceIntroductions = vi.fn(async (places: ItineraryPlace[]) => places);

      const result = await generateItineraryOnServer(
        {
          ...input,
          targetPlaceCount,
        },
        {
          config: {
            geminiApiKey: "gemini-key",
            googlePlacesApiKey: "google-key",
          },
          createGoogleFirstItinerary,
          createGeminiGuidedGoogleItinerary,
          generateGeminiItinerary,
          generateGeminiPlaceIntroductions,
        } as any,
      );

      expect(createGoogleFirstItinerary).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(targetPlaceCount);
      expect(result.slice(0, underfilledCount)).toEqual(guidedPlaces);
    },
  );

  it("tries to replenish a normal-intensity day when previous-day exclusions leave only four matched places", async () => {
    const guidedPlaces = makePlaces(4, "Guided Normal");
    const googleFirstPlaces = makePlaces(5, "Google Normal");
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue(googleFirstPlaces);
    const generateGeminiItinerary = vi.fn().mockResolvedValue(makePlaces(5, "Gemini Draft"));
    const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue(guidedPlaces);
    const generateGeminiPlaceIntroductions = vi.fn(async (places: ItineraryPlace[]) => places);

    const result = await generateItineraryOnServer(
      {
        ...input,
        excludedGooglePlaceIds: ["day-1-place-id"],
        excludedPlaceNames: ["Day 1 Landmark"],
        targetPlaceCount: 5,
      },
      {
        config: {
          geminiApiKey: "gemini-key",
          googlePlacesApiKey: "google-key",
        },
        createGoogleFirstItinerary,
        createGeminiGuidedGoogleItinerary,
        generateGeminiItinerary,
        generateGeminiPlaceIntroductions,
      } as any,
    );

    expect(createGoogleFirstItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        excludedGooglePlaceIds: expect.arrayContaining([
          "day-1-place-id",
          "guided-normal-place-1-id",
        ]),
        excludedPlaceNames: expect.arrayContaining([
          "Day 1 Landmark",
          "Guided Normal Place 1",
        ]),
        targetPlaceCount: 5,
      }),
      expect.objectContaining({ googleApiKey: "google-key" }),
    );
    expect(result).toHaveLength(5);
    expect(result.slice(0, 4)).toEqual(guidedPlaces);
  });

  it("keeps replenished normal-intensity results within the one-meal and one-cafe caps", async () => {
    const guidedPlaces = [
      makeTypedPlace("Guided Ramen", "restaurant", 1),
      makeTypedPlace("Guided Cafe", "cafe", 2),
      makeTypedPlace("Guided Museum", "culture", 3),
      makeTypedPlace("Guided Market", "shopping", 4),
    ];
    const googleFirstPlaces = [
      makeTypedPlace("Extra Sushi", "restaurant", 1),
      makeTypedPlace("Extra Tower", "attraction", 2),
      makeTypedPlace("Extra Garden", "nature", 3),
      makeTypedPlace("Extra Gallery", "culture", 4),
    ];
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue(googleFirstPlaces);
    const generateGeminiItinerary = vi.fn().mockResolvedValue(makePlaces(5, "Gemini Draft"));
    const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue(guidedPlaces);
    const generateGeminiPlaceIntroductions = vi.fn(async (places: ItineraryPlace[]) => places);

    const result = await generateItineraryOnServer(
      {
        ...input,
        targetPlaceCount: 5,
      },
      {
        config: {
          geminiApiKey: "gemini-key",
          googlePlacesApiKey: "google-key",
        },
        createGoogleFirstItinerary,
        createGeminiGuidedGoogleItinerary,
        generateGeminiItinerary,
        generateGeminiPlaceIntroductions,
      } as any,
    );

    expect(result).toHaveLength(5);
    expect(result.filter((place) => place.category === "restaurant")).toHaveLength(1);
    expect(result.filter((place) => place.category === "cafe")).toHaveLength(1);
    expect(result.map((place) => place.placeName)).toContain("Extra Tower");
    expect(result.map((place) => place.placeName)).not.toContain("Extra Sushi");
  });

  it("falls back to Google-first actual places when Gemini-guided matching returns no usable places", async () => {
    const createGoogleFirstItinerary = vi.fn().mockResolvedValue([googlePlace]);
    const generateGeminiItinerary = vi.fn().mockResolvedValue([geminiPlace]);
    const createGeminiGuidedGoogleItinerary = vi.fn().mockResolvedValue([]);
    const introducedPlace = {
      ...googlePlace,
      placeIntroduction:
        "?섏뭅? 濡쒖뺄 ?쇰찘? ?꾩퓼?ㅼ뭅???쇰찘??留쏅낵 ???덈뒗 ?뚯떇?먯엯?덈떎. 吏㏃? ?쇱젙 以??꾩? ?앸Ц?붾? 寃쏀뿕?섍린 醫뗭? ?μ냼?낅땲??",
    };
    const generateGeminiPlaceIntroductions = vi.fn().mockResolvedValue([introducedPlace]);

    const result = await generateItineraryOnServer(input, {
      config: {
        geminiApiKey: "gemini-key",
        googlePlacesApiKey: "google-key",
      },
      createGoogleFirstItinerary,
      createGeminiGuidedGoogleItinerary,
      generateGeminiItinerary,
      generateGeminiPlaceIntroductions,
    } as any);

    expect(result).toEqual([introducedPlace]);
    expect(generateGeminiItinerary).toHaveBeenCalledTimes(1);
    expect(createGoogleFirstItinerary).toHaveBeenCalledTimes(1);
    expect(generateGeminiPlaceIntroductions).toHaveBeenCalledWith(
      [googlePlace],
      expect.objectContaining({
        city: "Fukuoka",
        country: "JP",
      }),
      "gemini-key",
    );
  });
});
