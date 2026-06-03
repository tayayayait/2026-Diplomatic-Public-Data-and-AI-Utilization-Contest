import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ItineraryContext {
  country: string;
  city?: string;
  stayPurpose: string;
  stayDays: number;
  totalBudgetKrw: number;
  foodPreferences?: string[];
  placeInterests?: string[];
  accommodationLocation?: string;
}

export type PlaceRecommendationType = "restaurant" | "tourist_spot" | "cafe" | "other";
export type PlaceDataSource =
  | "google_places"
  | "google_routes"
  | "google_places_price_range"
  | "google_places_price_level"
  | "google_places_price_unavailable"
  | "place_type_rule"
  | "google_unavailable";

export interface PlaceRecommendation {
  name: string;
  address?: string; // 援ш?留?寃?됱쓣 ?꾪븳 ?뺥솗??二쇱냼 ?먮뒗 ?곸꽭 吏??챸
  googleMapsUri?: string; // Google Maps???ㅼ젣 ?μ냼 URL
  googleMapsUrl?: string; // ?쇰? 紐⑤뜽 ?묐떟 ?명솚??蹂꾩묶
  googlePlaceId?: string; // ?덉쑝硫?Google Maps URL??query_place_id濡??ъ슜
  websiteUri?: string; // Google Places媛 諛섑솚??怨듭떇/????뱀궗?댄듃 URL
  type: PlaceRecommendationType;
  estimatedCostKrw: number;
  durationMinutes: number;
  travelTimeFromPreviousMinutes?: number; // ?댁쟾 ?μ냼(?먮뒗 ?숈냼)濡쒕??곗쓽 ?대룞 ?쒓컙
  rating?: number;
  description: string;
  reason: string;
  costBasis?: string;
  costConfidence?: "high" | "medium" | "none";
  costDisplayText?: string;
  costSource?: PlaceDataSource;
  distanceMetersFromPrevious?: number;
  durationBasis?: string;
  durationSource?: PlaceDataSource;
  location?: {
    latitude: number;
    longitude: number;
  };
  openingHoursText?: string;
  placeDataSource?: PlaceDataSource;
  priceLevel?: string;
  priceRangeText?: string;
  primaryType?: string;
  primaryTypeDisplayName?: string;
  reviewSummary?: string;
  travelMode?: string;
  travelTimeBasis?: string;
  travelTimeSource?: PlaceDataSource;
  userRatingCount?: number;
}

export interface ItineraryItem {
  timeOfDay: "Morning" | "Afternoon" | "Evening";
  places: PlaceRecommendation[];
}

export interface LocalItineraryResult {
  title: string;
  description: string;
  totalEstimatedCostKrw: number;
  itinerary: ItineraryItem[];
  tips: string[];
  dataQualityNotices?: string[];
  totalCostBasisText?: string;
}

const itineraryContextSchema = z.object({
  country: z.string().min(1),
  city: z.string().optional(),
  stayPurpose: z.string().min(1),
  stayDays: z.number().positive(),
  totalBudgetKrw: z.number().nonnegative(),
  foodPreferences: z.array(z.string()).optional(),
  placeInterests: z.array(z.string()).optional(),
  accommodationLocation: z.string().optional(),
});

export const generateLocalItinerary = createServerFn({ method: "POST" })
  .inputValidator(itineraryContextSchema)
  .handler(async ({ data }): Promise<LocalItineraryResult> => {
    const { generateLocalItineraryOnServer } = await import("./gemini-recommendation.server");
    return generateLocalItineraryOnServer(data);
  });
