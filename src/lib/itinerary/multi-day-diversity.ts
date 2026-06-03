interface DayDiversityProfileInput {
  city?: string;
  country?: string;
  dayIndex: number;
  durationDays: number;
}

interface DayThemePreset {
  hint: string;
}

const genericDayPresets: DayThemePreset[] = [
  { hint: "focus on the central old-town, market, and riverside cluster." },
  { hint: "focus on parks, museums, shopping streets, and cafes in a different district." },
  { hint: "focus on a day-trip, waterfront, historic suburb, or another non-central atmosphere." },
];

const fukuokaDayPresets: DayThemePreset[] = [
  { hint: "focus on Hakata and Nakasu, including old-town landmarks and riverside night atmosphere." },
  { hint: "focus on Tenjin, Ohori Park, museums, shopping, and a slower cafe break." },
  { hint: "focus on Dazaifu, Momochi Seaside Park, Fukuoka Tower, or another day-trip/waterfront route." },
];



const includesAny = (value: string | undefined, targets: string[]) => {
  const normalized = value?.toLowerCase() ?? "";
  return targets.some((target) => normalized.includes(target));
};

const getPresetsForDestination = (input: Pick<DayDiversityProfileInput, "city" | "country">) => {
  if (
    includesAny(input.city, ["fukuoka", "?꾩퓼?ㅼ뭅"]) ||
    (input.country?.toUpperCase() === "JP" && includesAny(input.city, ["獵뤷깹"]))
  ) {
    return fukuokaDayPresets;
  }

  return genericDayPresets;
};

export const createDayDiversityProfile = ({
  city,
  country,
  dayIndex,
  durationDays,
}: DayDiversityProfileInput) => {
  const presets = getPresetsForDestination({ city, country });
  const preset = presets[(dayIndex - 1) % presets.length];

  return {
    dayThemeHint: `Day ${dayIndex} of ${durationDays}: ${preset.hint} Do not return to places or restaurant types already assigned to earlier days.`,
  };
};
