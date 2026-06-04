import { getBudgetStrategyLabel, type ItineraryBudgetPlan } from "@/lib/itinerary/budget-plan";
import {
  getItineraryCompositionPolicy,
  selectTargetPlaceCount,
} from "@/lib/itinerary/recommendation-policy";


export interface ItineraryPromptInput {
  country: string;
  city?: string;
  accommodationLat?: number;
  accommodationLng?: number;
  accommodationAddress?: string;
  budget: string;
  budgetPlan?: ItineraryBudgetPlan;
  dayIndex?: number;
  dayThemeHint?: string;
  durationMinutes?: number;
  includeMeals?: boolean;
  tripDurationDays?: number;
  startTime: string;
  targetPlaceCount?: number;
  travelModes?: string[];
  excludedPlaceNames?: string[];
}

const formatList = (items: string[], fallback: string) =>
  items.length > 0 ? items.join(", ") : fallback;

const formatAccommodationContext = ({
  accommodationAddress,
  accommodationLat,
  accommodationLng,
}: Pick<
  ItineraryPromptInput,
  "accommodationAddress" | "accommodationLat" | "accommodationLng"
>) => {
  const address = accommodationAddress?.trim();
  if (!address) {
    return [
      "- Accommodation address: not provided",
      "- Accommodation coordinates: not provided",
    ].join("\n");
  }

  const hasCoordinates =
    Number.isFinite(accommodationLat) && Number.isFinite(accommodationLng);
  const coordinates = hasCoordinates
    ? `${accommodationLat}, ${accommodationLng}`
    : "not provided";

  return [
    `- Accommodation address: ${address}`,
    `- Accommodation coordinates: ${coordinates}`,
  ].join("\n");
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

const formatBudgetPlanContext = (budgetPlan?: ItineraryBudgetPlan) => {
  if (!budgetPlan) return "- Structured budget plan: not provided";

  const local = budgetPlan.dailyLocalBudget;
  const currency = budgetPlan.targetCurrency ?? "local currency";
  return [
    budgetPlan.totalBudgetKrw !== undefined
      ? `- Total trip budget: ${formatNumber(budgetPlan.totalBudgetKrw)} KRW`
      : null,
    budgetPlan.dailyBudgetKrw !== undefined
      ? `- Daily trip budget: ${formatNumber(budgetPlan.dailyBudgetKrw)} KRW`
      : null,
    local
      ? `- Daily local allocation: food ${formatNumber(local.food)} ${currency}, transport ${formatNumber(local.transport)} ${currency}, activity ${formatNumber(local.activity)} ${currency}`
      : null,
    `- Budget strategy: ${getBudgetStrategyLabel(budgetPlan.strategy)}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
};

const formatExcludedPlaceContext = (placeNames?: string[]) => {
  const names = [...new Set((placeNames ?? []).map((name) => name.trim()).filter(Boolean))];
  if (names.length === 0) return "- Previously recommended places to avoid: none";

  return [
    `- Avoid these previously recommended places: ${names.join(", ")}`,
    "- Do not reuse exact or similar place names from the avoid list, including translated, localized, or abbreviated aliases.",
  ].join("\n");
};

const formatDayContext = ({
  dayIndex,
  dayThemeHint,
  tripDurationDays,
}: Pick<ItineraryPromptInput, "dayIndex" | "dayThemeHint" | "tripDurationDays">) => {
  const lines: string[] = [];

  if (dayIndex && tripDurationDays) {
    lines.push(`- Trip day: Day ${dayIndex} of ${tripDurationDays}`);
  }

  if (dayThemeHint?.trim()) {
    lines.push(`- Day diversity focus: ${dayThemeHint.trim()}`);
  }

  return lines.length > 0 ? lines.join("\n") : "- Trip day: single-day or unspecified";
};

export const buildItineraryPrompt = (input: ItineraryPromptInput) => {
  const destination = input.city ? `${input.city}, ${input.country}` : input.country;
  const accommodationContext = formatAccommodationContext(input);
  const budgetPlanContext = formatBudgetPlanContext(input.budgetPlan);
  const excludedPlaceContext = formatExcludedPlaceContext(input.excludedPlaceNames);
  const dayContext = formatDayContext(input);
  const targetPlaceCount = selectTargetPlaceCount(input);
  const composition = getItineraryCompositionPolicy(input);
  const mealInstruction =
    composition.mealCount === 0 && composition.snackCount === 0
      ? `For this ${targetPlaceCount}-place itinerary, do not include restaurant meals, cafes, or snack stops. Fill all ${targetPlaceCount} places with attractions, culture, nature, experiences, shopping, or other non-food activities.`
      : `For this ${targetPlaceCount}-place itinerary, include exactly ${composition.mealCount} restaurant meal stop(s) and exactly ${composition.snackCount} cafe/snack stop(s). Do not exceed these counts. Fill the remaining ${composition.nonFoodCount} places with attractions, culture, nature, experiences, shopping, or other non-food activities. Use 'meal' for restaurant stops and 'snack' for cafe stops. Do not label stops as breakfast, lunch, or dinner. Classify shopping malls and mixed-use complexes such as Canal City Hakata as shopping or attraction, not cafe.`;
  const travelModeHint = input.travelModes && input.travelModes.length > 0
    ? `- Primary travel modes: ${input.travelModes.join(", ")}. Limit the distance between consecutive places according to these modes to avoid excessively long travel times (e.g., do not suggest an 18km walk).`
    : `- Limit the distance between consecutive places to avoid excessively long travel times.`;

  return `
You are an expert travel planner and local guide. Generate a realistic, immediately usable one-day itinerary for ${destination}.

## System Context
- Destination: ${destination}
${accommodationContext}
- Role: create a planning draft. The server will run Google Places matching before returning final places to the user.
- Do not invent prices, opening hours, ratings, or route durations. Use "Google Places matching required" when exact factual data must be verified.

## User Preferences
- Budget level: ${input.budget}
${budgetPlanContext}
- Use the daily budget as planning context, not as a strict spending cap.
- Prioritize famous or high-value places when they materially improve the itinerary, even if they are not the cheapest option.
- Timeline starting at ${input.startTime}
- Target place count: Recommend exactly ${targetPlaceCount} places.
- Use the start time to choose a natural travel rhythm, meal timing, and rest stops. Do not pad or stretch places to match a fixed end time.
${travelModeHint}
${dayContext}
- Place and food recommendations: Dynamically select appealing places, landmarks, and local foods based on destination, user profile, budget, and time of day.
- Meal policy: ${mealInstruction}
${excludedPlaceContext}

## Route Constraints
1. If an accommodation address is provided, start from the accommodation and end by returning to the accommodation.
2. Use a cluster-based route: choose places in a compact geographic cluster before moving to another area.
3. Minimize backtracking and order places by practical walking/transit flow.
4. Estimate travel time realistically based on the selected travel modes (${input.travelModes?.join(", ") ?? "WALK"}). If distance is over 2km and TRANSIT is selected, estimate using public transit time instead of walking. Do NOT suggest unreasonably far places that cause massive transit/walking gaps.
5. Fill travelFromPrevMinutes and travelFromPrevDistance for every place. For the first place, calculate from the accommodation when provided.
6. Build a loose chronological sequence starting at ${input.startTime}; each place must include startTime and endTime in HH:mm as rough estimates only.
7. The total number of generated places must match the target place count above.
8. ${mealInstruction}
9. If this is part of a multi-day trip, choose a different area, theme, food category, and atmosphere from earlier days.

## Place Introduction Rules
- For placeIntroduction, use Gemini's internal travel and place knowledge to explain what the place is and why a traveler may want to visit.
- Write placeIntroduction in Korean, 1-2 concise sentences.
- Do not put recommendation scoring, ratings, review counts, opening hours, prices, route time, or unverifiable live facts in placeIntroduction.
- Keep description as internal recommendation rationale; the user-facing card will show placeIntroduction instead.

## Output Contract
- Return only valid JSON.
- Return a JSON array, not markdown.
- Return exactly ${targetPlaceCount} places. Do not add filler places just to occupy time.
- Each item must include: order, placeName, koName, category, theme, placeIntroduction, description, startTime, endTime, estimatedMinutes, estimatedCost, travelFromPrevMinutes, travelFromPrevDistance, mealSlot, lat, lng.
- category must be one of: attraction, restaurant, cafe, shopping, nature, culture, accommodation.
- mealSlot must be one of: breakfast, lunch, dinner, snack, meal, none. Use 'meal' for restaurant food stops and 'snack' for cafe stops. Do not use breakfast, lunch, or dinner. For attractions, shopping, culture, nature, and other activities, mealSlot MUST be 'none'.
- order must be sequential starting from 1.
- placeName must be searchable in Google Maps.
- The final user-visible place facts will come from Google Places matching, so choose precise candidate names and realistic timing logic.
`.trim();
};
