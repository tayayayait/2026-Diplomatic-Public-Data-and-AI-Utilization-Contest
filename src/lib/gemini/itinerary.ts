import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, Type } from "@google/genai";
import { getServerConfig } from "../config.server";
import { z } from "zod";
import {
  geminiItineraryResponseSchema,
  parseGeminiItineraryResponseText,
  type ItineraryPlace,
} from "./schema";
import { buildItineraryPrompt } from "./itinerary-prompt";
import { createGoogleFirstItinerary } from "@/lib/itinerary/google-first-itinerary";
import { createGeminiGuidedGoogleItinerary } from "@/lib/itinerary/gemini-guided-google-itinerary";
import {
  getRadiusPolicyForTravelModes,
  selectTargetPlaceCount,
  travelModeSchema,
} from "@/lib/itinerary/recommendation-policy";

const BudgetPlanSchema = z.object({
  dailyBudgetKrw: z.number().optional(),
  dailyLocalBudget: z
    .object({
      accommodation: z.number(),
      activity: z.number(),
      food: z.number(),
      total: z.number(),
      transport: z.number(),
    })
    .optional(),
  exchangeRateKrwPerLocal: z.number().optional(),
  stayDays: z.number().optional(),
  strategy: z.enum(["saving", "balanced", "experience"]),
  targetCurrency: z.string().optional(),
  totalBudgetKrw: z.number().optional(),
});

const ItineraryInputSchema = z.object({
  country: z.string(),
  city: z.string().optional(),
  accommodationLat: z.number().optional(),
  accommodationLng: z.number().optional(),
  accommodationAddress: z.string().optional(),
  budget: z.string(),
  budgetPlan: BudgetPlanSchema.optional(),
  dayIndex: z.number().int().min(1).optional(),
  dayThemeHint: z.string().trim().optional(),
  durationMinutes: z.number(),
  excludedGooglePlaceIds: z.array(z.string()).default([]),
  excludedPlaceNames: z.array(z.string()).default([]),
  startTime: z.string().default("09:00"),
  travelModes: z.array(travelModeSchema).min(1).default(["WALK", "TRANSIT"]),
  tripDurationDays: z.number().int().min(1).optional(),
});

type ItineraryInput = z.infer<typeof ItineraryInputSchema>;

interface ItineraryServerConfig {
  geminiApiKey?: string;
  googlePlacesApiKey?: string;
}

interface ItineraryGenerationDeps {
  config?: ItineraryServerConfig;
  createGoogleFirstItinerary?: typeof createGoogleFirstItinerary;
  createGeminiGuidedGoogleItinerary?: typeof createGeminiGuidedGoogleItinerary;
  generateGeminiItinerary?: (data: ItineraryInput, apiKey: string) => Promise<ItineraryPlace[]>;
  generateGeminiPlaceIntroductions?: (
    places: ItineraryPlace[],
    data: ItineraryInput,
    apiKey: string,
  ) => Promise<ItineraryPlace[]>;
}

const GeminiPlaceIntroductionSchema = z.array(
  z.object({
    order: z.number().int(),
    placeIntroduction: z.string().trim().min(1),
    placeName: z.string(),
  }),
);

const geminiPlaceIntroductionResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      order: { type: Type.INTEGER, description: "일정 순서" },
      placeName: { type: Type.STRING, description: "입력으로 받은 장소명" },
      placeIntroduction: {
        type: Type.STRING,
        description: "Gemini의 장소 지식으로 작성한 한국어 장소 소개 1~2문장",
      },
    },
    required: ["order", "placeName", "placeIntroduction"],
  },
};

const hasFiniteAccommodationCoordinates = (data: ItineraryInput) =>
  Number.isFinite(data.accommodationLat) && Number.isFinite(data.accommodationLng);

const hasAccommodationAddress = (data: ItineraryInput) =>
  Boolean(data.accommodationAddress?.trim());

const canUseGoogleFirstItinerary = (data: ItineraryInput, config: ItineraryServerConfig) =>
  Boolean(
    config.googlePlacesApiKey &&
      (hasFiniteAccommodationCoordinates(data) || hasAccommodationAddress(data)),
  );

const createGoogleFirstRequest = (data: ItineraryInput) => {
  const radiusPolicy = getRadiusPolicyForTravelModes(data.travelModes);

  return {
    budget: data.budget,
    budgetPlan: data.budgetPlan,
    city: data.city,
    country: data.country,
    departure: {
      address: data.accommodationAddress,
      lat: data.accommodationLat,
      lng: data.accommodationLng,
    },
    durationMinutes: data.durationMinutes,
    excludedGooglePlaceIds: data.excludedGooglePlaceIds,
    excludedPlaceNames: data.excludedPlaceNames,
    searchRadiusMeters: radiusPolicy.default,
    sortMode: "route_optimized" as const,
    startTime: data.startTime,
    travelModes: data.travelModes,
  };
};

const attachGeminiRecommendationContext = (
  places: ItineraryPlace[],
  data: ItineraryInput,
): ItineraryPlace[] => {
  const radiusPolicy = getRadiusPolicyForTravelModes(data.travelModes);

  return places.map((place) => ({
    ...place,
    recommendationContext: {
      searchRadiusMeters: radiusPolicy.default,
      sortMode: "route_optimized",
      source: "gemini",
      travelModes: data.travelModes,
    },
  }));
};

const buildPlaceIntroductionPrompt = (places: ItineraryPlace[], data: ItineraryInput) => {
  const destination = data.city ? `${data.city}, ${data.country}` : data.country;
  const placeLines = places
    .map(
      (place) =>
        `- order ${place.order}: ${place.koName || place.placeName} / searchName: ${place.placeName} / category: ${place.category} / theme: ${place.theme}`,
    )
    .join("\n");

  return `
You are a local travel guide. Generate user-facing Korean place introductions for confirmed itinerary places in ${destination}.

Rules:
- Use Gemini's internal travel and place knowledge.
- Explain what each exact place is and why a traveler may want to visit.
- Write 1-2 concise Korean sentences per place.
- Avoid generic category templates such as "도시의 대표적인 볼거리", "지역 분위기를 확인하기 좋은 방문지", or "여행지의 인상을 잡기 좋은 장소".
- Do not mention recommendation scores, ratings, review counts, opening hours, prices, route time, or unverifiable live facts.
- Return only valid JSON array.
- Preserve each input order.

Places:
${placeLines}
`.trim();
};

export const generateGeminiPlaceIntroductions = async (
  places: ItineraryPlace[],
  data: ItineraryInput,
  apiKey: string,
): Promise<ItineraryPlace[]> => {
  if (places.length === 0) return places;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildPlaceIntroductionPrompt(places, data),
    config: {
      responseMimeType: "application/json",
      responseSchema: geminiPlaceIntroductionResponseSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty place introduction response from Gemini API");
  }

  const parsed = GeminiPlaceIntroductionSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error("Invalid Gemini place introduction response schema");
  }

  const introductionByOrder = new Map(
    parsed.data.map((item) => [item.order, item.placeIntroduction] as const),
  );

  return places.map((place) => ({
    ...place,
    placeIntroduction: introductionByOrder.get(place.order) ?? place.placeIntroduction,
  }));
};

export const generateGeminiItinerary = async (
  data: ItineraryInput,
  apiKey: string,
): Promise<ItineraryPlace[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildItineraryPrompt(data);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: geminiItineraryResponseSchema,
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return parseGeminiItineraryResponseText(text);
};

export const generateItineraryOnServer = async (
  rawData: ItineraryInput,
  deps: ItineraryGenerationDeps = {},
): Promise<ItineraryPlace[]> => {
  const data = ItineraryInputSchema.parse(rawData);
  const config = deps.config ?? getServerConfig();
  const geminiApiKey = config.geminiApiKey || process.env.VITE_GEMINI_API_KEY;
  const googleFirstRequest = createGoogleFirstRequest(data);
  const targetPlaceCount = selectTargetPlaceCount(data.durationMinutes);
  let geminiGuidedPlaces: ItineraryPlace[] = [];

  if (canUseGoogleFirstItinerary(data, config) && geminiApiKey) {
    const gemini = deps.generateGeminiItinerary ?? generateGeminiItinerary;
    const draftPlaces = await gemini(data, geminiApiKey);
    const googleMatcher =
      deps.createGeminiGuidedGoogleItinerary ?? createGeminiGuidedGoogleItinerary;
    geminiGuidedPlaces = await googleMatcher(googleFirstRequest, draftPlaces, {
      googleApiKey: config.googlePlacesApiKey!,
    });

    const isLongDurationUnderfilled =
      targetPlaceCount > 5 && geminiGuidedPlaces.length <= 5;

    if (geminiGuidedPlaces.length > 0 && !isLongDurationUnderfilled) {
      return geminiGuidedPlaces;
    }
  }

  if (canUseGoogleFirstItinerary(data, config)) {
    const googleFirst = deps.createGoogleFirstItinerary ?? createGoogleFirstItinerary;
    const places = await googleFirst(googleFirstRequest, {
      googleApiKey: config.googlePlacesApiKey!,
    });

    if (places.length > 0) {
      if (!geminiApiKey) return places;

      const placeIntroductionGenerator =
        deps.generateGeminiPlaceIntroductions ?? generateGeminiPlaceIntroductions;

      return placeIntroductionGenerator(places, data, geminiApiKey);
    }
  }

  if (geminiGuidedPlaces.length > 0) {
    return geminiGuidedPlaces;
  }

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const gemini = deps.generateGeminiItinerary ?? generateGeminiItinerary;

  return attachGeminiRecommendationContext(await gemini(data, geminiApiKey), data);
};

export const generateItineraryFn = createServerFn({ method: "POST" })
  .inputValidator(ItineraryInputSchema)
  .handler(async ({ data }) => {
    try {
      return await generateItineraryOnServer(data);
    } catch (error) {
      console.error("Itinerary Generation Error:", error);
      throw new Error("Failed to generate itinerary. Please try again.");
    }
  });
