import { describe, expect, it, vi } from "vitest";
import type { DiploLifeStore, UserProfile } from "@/lib/diplolife/state";
import {
  canRequestItinerary,
  applyBudgetKrwToItinerarySettings,
  createAccommodationProfilePatch,
  createItinerarySettingsProfileKey,
  getItineraryPrerequisiteState,
  getSmartDefaults,
  selectItineraryProfile,
  selectUpdateItineraryProfile,
} from "./page-state";

const profile: UserProfile = {
  id: "user_1",
  name: "?띻만??",
  country: "JP",
  city: "?꾩퓙",
  visaType: "TOURIST",
  stayPurpose: "TRAVEL",
  stayStartDate: "2026-06-01",
  stayEndDate: "2026-06-07",
  interests: ["SAFETY"],
  foodPreferences: ["?ㅼ떆", "?쇰찘"],
  placeInterests: ["誘몄닠愿", "怨듭썝"],
  accommodationLocation: "Tokyo Station",
  onboardingComplete: true,
  notificationSettings: {
    visa: true,
    safety: true,
    exchangeRate: true,
    weather: true,
    notices: true,
    aiInsight: true,
  },
  theme: "system",
  language: "ko",
};

describe("itinerary page state helpers", () => {
  it("selects the current DiploLife profile and update action", () => {
    const updateUserProfile = vi.fn();
    const state = {
      userProfile: profile,
      updateUserProfile,
    } as unknown as DiploLifeStore;

    expect(selectItineraryProfile(state)).toBe(profile);
    expect(selectUpdateItineraryProfile(state)).toBe(updateUserProfile);
  });

  it("derives smart defaults from the profile when preferences exist", () => {
    expect(getSmartDefaults(profile)).toEqual({
      budget: "蹂댄넻",
      budgetStrategy: "balanced",
      itineraryIntensity: "normal",
      startTime: "09:00",
      travelModes: ["WALK", "TRANSIT"],
    });
  });

  it("uses stable fallback defaults when the profile is missing", () => {
    expect(getSmartDefaults(null)).toEqual({
      budget: "蹂댄넻",
      budgetStrategy: "balanced",
      itineraryIntensity: "normal",
      startTime: "09:00",
      travelModes: ["WALK", "TRANSIT"],
    });
  });

  it("does not require a Google Maps key before requesting Gemini itinerary generation", () => {
    expect(canRequestItinerary({ country: "JP", isPending: false })).toBe(true);
    expect(canRequestItinerary({ country: "JP", isPending: true })).toBe(false);
    expect(canRequestItinerary({ country: undefined, isPending: false })).toBe(false);
  });

  it("requires a persisted profile with a destination country before showing itinerary generation", () => {
    expect(getItineraryPrerequisiteState(null)).toEqual({
      canGenerate: false,
      ctaHref: "/onboarding",
      message: "泥대쪟 援??? 湲곕낯 ?꾨줈?꾩쓣 癒쇱? ?ㅼ젙?댁빞 AI ?쇱젙???앹꽦?????덉뒿?덈떎.",
      status: "missing_profile",
    });
    expect(getItineraryPrerequisiteState({ ...profile, country: "" })).toMatchObject({
      canGenerate: false,
      status: "missing_country",
    });
    expect(getItineraryPrerequisiteState(profile)).toEqual({
      canGenerate: true,
      ctaHref: null,
      message: null,
      status: "ready",
    });
  });

  it("applies a cost-page budget handoff to itinerary settings", () => {
    const defaults = getSmartDefaults(profile);

    expect(applyBudgetKrwToItinerarySettings(defaults, 800000)).toEqual({
      ...defaults,
      budget: "800,000???섏?",
    });
    expect(applyBudgetKrwToItinerarySettings(defaults, undefined)).toBe(defaults);
  });

  it("stores finite accommodation coordinates with the accommodation location", () => {
    expect(
      createAccommodationProfilePatch(profile, {
        lat: 35.6812,
        lng: 139.7671,
        location: "Tokyo Station",
      }),
    ).toEqual({
      accommodationLat: 35.6812,
      accommodationLng: 139.7671,
      accommodationLocation: "Tokyo Station",
    });
  });

  it("clears stale accommodation coordinates when the location changes without new coordinates", () => {
    expect(
      createAccommodationProfilePatch(
        {
          ...profile,
          accommodationLat: 35.6812,
          accommodationLng: 139.7671,
          accommodationLocation: "Tokyo Station",
        },
        { location: "Shinjuku Station" },
      ),
    ).toEqual({
      accommodationLat: undefined,
      accommodationLng: undefined,
      accommodationLocation: "Shinjuku Station",
    });
  });

  it("keeps existing accommodation coordinates when saving the same location without geocoding", () => {
    expect(
      createAccommodationProfilePatch(
        {
          ...profile,
          accommodationLat: 35.6812,
          accommodationLng: 139.7671,
          accommodationLocation: "Tokyo Station",
        },
        { location: " Tokyo Station " },
      ),
    ).toEqual({
      accommodationLat: 35.6812,
      accommodationLng: 139.7671,
      accommodationLocation: "Tokyo Station",
    });
  });

  it("changes the itinerary settings key for preference defaults but not accommodation changes", () => {
    const baseKey = createItinerarySettingsProfileKey(profile);

    expect(
      createItinerarySettingsProfileKey({
        ...profile,
        accommodationLocation: "Shinjuku Station",
      }),
    ).toBe(baseKey);
    expect(
      createItinerarySettingsProfileKey({
        ...profile,
        placeInterests: ["museums"],
      }),
    ).not.toBe(baseKey);
  });
});
