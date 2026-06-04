import { describe, expect, it } from "vitest";
import { buildItineraryPrompt } from "./itinerary-prompt";

const baseInput = {
  country: "JP",
  city: "Fukuoka",
  budget: "보통",
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
  startTime: "09:00",
  targetPlaceCount: 5,
};

describe("itinerary prompt builder", () => {
  it("includes an accommodation address even when coordinates are missing", () => {
    const prompt = buildItineraryPrompt({
      ...baseInput,
      accommodationAddress: "Hakata Station Hotel",
    });

    expect(prompt).toContain("Accommodation address: Hakata Station Hotel");
    expect(prompt).toContain("Accommodation coordinates: not provided");
    expect(prompt).not.toContain("undefined");
  });

  it("includes accommodation coordinates when both latitude and longitude are provided", () => {
    const prompt = buildItineraryPrompt({
      ...baseInput,
      accommodationAddress: "Hakata Station Hotel",
      accommodationLat: 33.5902,
      accommodationLng: 130.4206,
    });

    expect(prompt).toContain("Accommodation address: Hakata Station Hotel");
    expect(prompt).toContain("Accommodation coordinates: 33.5902, 130.4206");
  });

  it("sets route, meal, natural pacing, and JSON output constraints", () => {
    const prompt = buildItineraryPrompt(baseInput);

    expect(prompt).toContain("cluster-based route");
    expect(prompt).toContain("cluster-based route");
    expect(prompt).toContain("include exactly 1 restaurant meal stop(s)");
    expect(prompt).toContain("exactly 1 cafe/snack stop(s)");
    expect(prompt).toContain("Fill the remaining 3 places");
    expect(prompt).toContain("Classify shopping malls and mixed-use complexes such as Canal City Hakata as shopping or attraction, not cafe");
    expect(prompt).toContain("Use 'meal' for restaurant stops and 'snack' for cafe stops");
    expect(prompt).toContain("Do not use breakfast, lunch, or dinner");
    expect(prompt).toContain("starting at 09:00");
    expect(prompt).toContain("Target place count: Recommend exactly 5 places.");
    expect(prompt).toContain("Do not pad or stretch places to match a fixed end time");
    expect(prompt).not.toContain("Total available time");
    expect(prompt).not.toContain("Target End Time");
    expect(prompt).not.toContain("MUST span exactly");
    expect(prompt).toContain("Return only valid JSON");
    expect(prompt).toContain("Return exactly 5 places.");
    expect(prompt).toContain("placeIntroduction");
  });

  it("states that Gemini creates the planning draft and Google Places verifies final place facts", () => {
    const prompt = buildItineraryPrompt(baseInput);

    expect(prompt).toContain("planning draft");
    expect(prompt).toContain("Google Places matching");
    expect(prompt).toContain("Do not invent prices, opening hours, ratings, or route durations");
    expect(prompt).toContain("use Gemini's internal travel and place knowledge");
    expect(prompt).toContain("user-facing card will show placeIntroduction");
  });

  it("includes structured budget allocation constraints", () => {
    const prompt = buildItineraryPrompt(baseInput);

    expect(prompt).toContain("Budget level: 보통");
    expect(prompt).toContain("Total trip budget: 800,000 KRW");
    expect(prompt).toContain("Daily trip budget: 72,727 KRW");
    expect(prompt).toContain("Daily local allocation: food 2,500 JPY, transport 700 JPY, activity 659 JPY");
    expect(prompt).toContain("Use the daily budget as planning context, not as a strict spending cap");
    expect(prompt).toContain("Prioritize famous or high-value places");
    expect(prompt).toContain("Budget strategy: 균형");
  });
  it("includes previous places to avoid when provided", () => {
    const prompt = buildItineraryPrompt({
      ...baseInput,
      excludedPlaceNames: ["Old Landmark", "Repeated Ramen"],
    });

    expect(prompt).toContain("Avoid these previously recommended places: Old Landmark, Repeated Ramen");
    expect(prompt).toContain("Do not reuse exact or similar place names from the avoid list");
  });
});
