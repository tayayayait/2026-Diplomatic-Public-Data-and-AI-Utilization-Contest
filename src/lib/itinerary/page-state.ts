import type { DiploLifeStore, UserProfile } from "@/lib/diplolife/state";

export type MealPreference = "local" | "quick" | "fine_dining";

export interface ItineraryGenerationSettings {
  durationMinutes: number;
  startTime: string;
  includeMeals: boolean;
  mealPreference: MealPreference;
  vibeThemes: string[];
  foodThemes: string[];
  budget: string;
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
  includeMeals: true,
  mealPreference: "local",
  vibeThemes: profile?.placeInterests?.length ? [...profile.placeInterests] : [...fallbackVibeThemes],
  foodThemes: profile?.foodPreferences?.length ? [...profile.foodPreferences] : [...fallbackFoodThemes],
  budget: profile?.stayPurpose === "STUDY" ? "저렴" : "보통",
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
