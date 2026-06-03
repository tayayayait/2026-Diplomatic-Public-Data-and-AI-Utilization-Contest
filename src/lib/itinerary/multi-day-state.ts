import type { UserProfile } from "@/lib/diplolife/state";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import { calculateTripDuration } from "@/lib/itineraryUtils";
import type { Place, TimelineSlot } from "@/store/itineraryStore";

interface ItineraryStoreSeedInput {
  fallbackStartDate?: string;
  places?: ItineraryPlace[];
  placesByDay?: Array<{
    dayIndex: number;
    places: ItineraryPlace[];
  }>;
  profile?: UserProfile | null;
}

interface GeneratedDaySeed {
  dayIndex: number;
  slots: TimelineSlot[];
}

export interface ItineraryStoreSeed {
  durationDays: number;
  endDate: string;
  generatedDays: GeneratedDaySeed[];
  globalPlaces: Place[];
  startDate: string;
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoDate = (value: string | null | undefined): value is string => {
  if (!value || !isoDatePattern.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const normalizeDateRange = (
  profile: UserProfile | null | undefined,
  fallbackStartDate = todayIsoDate(),
) => {
  const startDate = isValidIsoDate(profile?.stayStartDate) ? profile.stayStartDate : fallbackStartDate;
  const profileEndDate = profile?.stayEndDate ?? undefined;
  const endDate = isValidIsoDate(profileEndDate) && profileEndDate >= startDate ? profileEndDate : startDate;

  return {
    durationDays: calculateTripDuration(startDate, endDate),
    endDate,
    startDate,
  };
};

const placeTypeByCategory: Record<ItineraryPlace["category"], Place["type"]> = {
  accommodation: "accommodation",
  attraction: "attraction",
  cafe: "cafe",
  culture: "attraction",
  nature: "attraction",
  restaurant: "restaurant",
  shopping: "mart",
};

const createGeneratedPlaceId = (place: ItineraryPlace, index: number, dayIndex = 1) =>
  `generated-day-${dayIndex}-${place.order || index + 1}-${index}`;

const createGeneratedPlace = (place: ItineraryPlace, index: number, dayIndex = 1): Place => ({
  description: place.description,
  id: createGeneratedPlaceId(place, index, dayIndex),
  imageUrl: place.photoUrl,
  location:
    Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? { lat: place.lat, lng: place.lng }
      : undefined,
  name: place.koName || place.placeName,
  type: placeTypeByCategory[place.category] ?? "custom",
});

const sortPlacesByOrder = (places: ItineraryPlace[]) =>
  places
    .map((place, index) => ({ index, place }))
    .sort((left, right) => left.place.order - right.place.order || left.index - right.index);

export const createItineraryStoreSeed = ({
  fallbackStartDate,
  places = [],
  placesByDay,
  profile,
}: ItineraryStoreSeedInput): ItineraryStoreSeed => {
  const { durationDays, endDate, startDate } = normalizeDateRange(profile, fallbackStartDate);
  const dayPlaceGroups =
    placesByDay?.length
      ? placesByDay
      : places.length > 0
        ? [{ dayIndex: 1, places }]
        : [];
  const globalPlaces = dayPlaceGroups.flatMap(({ dayIndex, places: dayPlaces }) =>
    sortPlacesByOrder(dayPlaces).map(({ index, place }) =>
      createGeneratedPlace(place, index, dayIndex),
    ),
  );
  const generatedDays = dayPlaceGroups
    .map(({ dayIndex, places: dayPlaces }) => {
      const orderedPlaces = sortPlacesByOrder(dayPlaces);
      const slots: TimelineSlot[] = orderedPlaces.map(({ index, place }) => {
        const generatedPlace = createGeneratedPlace(place, index, dayIndex);

        return {
          endTime: place.endTime,
          id: `generated-slot-day-${dayIndex}-${place.order || index + 1}-${index}`,
          itineraryPlace: place,
          memo: place.travelFromPrevDistance,
          place: generatedPlace,
          placeId: generatedPlace.id,
          slotType: "optional",
          startTime: place.startTime,
        };
      });

      return { dayIndex, slots };
    })
    .filter((day) => day.slots.length > 0);

  return {
    durationDays,
    endDate,
    generatedDays,
    globalPlaces,
    startDate,
  };
};
