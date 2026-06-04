import type { DiploLifeStore, UserProfile } from "@/lib/diplolife/state";
import type { BudgetStrategy } from "@/lib/itinerary/budget-plan";
import type { ItineraryIntensity, TravelMode } from "@/lib/itinerary/recommendation-policy";

export type MealPreference = "local" | "quick" | "fine_dining";

export interface ItineraryGenerationSettings {
  durationMinutes?: number;
  startTime: string;
  budget: string;
  budgetStrategy: BudgetStrategy;
  itineraryIntensity: ItineraryIntensity;
  travelModes: TravelMode[];
}

interface AccommodationProfilePatchInput {
  lat?: number | null;
  lng?: number | null;
  location?: string | null;
}

const fallbackVibeThemes = ["필수 랜드마크 & 명소"];
const fallbackFoodThemes = ["현지 로컬 맛집"];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeLocation = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
};

export const selectItineraryProfile = (state: DiploLifeStore) => state.userProfile;

export const selectUpdateItineraryProfile = (state: DiploLifeStore) => state.updateUserProfile;

export const getSmartDefaults = (
  profile: UserProfile | null | undefined,
): ItineraryGenerationSettings => ({
  durationMinutes: profile?.stayPurpose === "TRAVEL" ? 480 : 360,
  startTime: "09:00",
  budget: profile?.stayPurpose === "STUDY" ? "저렴" : "보통",
  budgetStrategy: "balanced",
  itineraryIntensity: "normal",
  travelModes: ["WALK", "TRANSIT"],
});

export const applyBudgetKrwToItinerarySettings = (
  settings: ItineraryGenerationSettings,
  budgetKrw?: number,
): ItineraryGenerationSettings => {
  if (!budgetKrw || !Number.isFinite(budgetKrw) || budgetKrw <= 0) return settings;

  return {
    ...settings,
    budget: `${Math.round(budgetKrw).toLocaleString("ko-KR")}원 수준`,
  };
};

export const createAccommodationProfilePatch = (
  profile: Pick<UserProfile, "accommodationLat" | "accommodationLng" | "accommodationLocation"> | null | undefined,
  input: AccommodationProfilePatchInput,
): Partial<UserProfile> => {
  const accommodationLocation = normalizeLocation(input.location);

  if (!accommodationLocation) {
    return {
      accommodationLat: undefined,
      accommodationLng: undefined,
      accommodationLocation: undefined,
    };
  }

  if (isFiniteNumber(input.lat) && isFiniteNumber(input.lng)) {
    return {
      accommodationLat: input.lat,
      accommodationLng: input.lng,
      accommodationLocation,
    };
  }

  const previousLocation = normalizeLocation(profile?.accommodationLocation);
  const hasReusableCoordinates =
    previousLocation === accommodationLocation &&
    isFiniteNumber(profile?.accommodationLat) &&
    isFiniteNumber(profile?.accommodationLng);

  return {
    accommodationLat: hasReusableCoordinates ? profile.accommodationLat : undefined,
    accommodationLng: hasReusableCoordinates ? profile.accommodationLng : undefined,
    accommodationLocation,
  };
};

export const createItinerarySettingsProfileKey = (
  profile: UserProfile | null | undefined,
): string =>
  JSON.stringify({
    foodPreferences: profile?.foodPreferences ?? [],
    placeInterests: profile?.placeInterests ?? [],
    stayPurpose: profile?.stayPurpose ?? null,
  });

export const canRequestItinerary = ({
  country,
  isPending,
}: {
  country?: string | null;
  isPending: boolean;
}) => Boolean(country) && !isPending;

export const getItineraryPrerequisiteState = (
  profile: UserProfile | null | undefined,
) => {
  if (!profile) {
    return {
      canGenerate: false,
      ctaHref: "/onboarding",
      message: "체류 국가 등 기본 프로필을 먼저 설정해야 AI 일정을 생성할 수 있습니다.",
      status: "missing_profile",
    };
  }
  if (!profile.country) {
    return {
      canGenerate: false,
      ctaHref: "/onboarding",
      message: "체류 국가 등 기본 프로필을 먼저 설정해야 AI 일정을 생성할 수 있습니다.",
      status: "missing_country",
    };
  }
  return {
    canGenerate: true,
    ctaHref: null,
    message: null,
    status: "ready",
  };
};
