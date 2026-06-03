import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Loader2, MapPin, Sparkles } from "lucide-react";

import type { ItineraryPlace } from "@/lib/gemini/schema";
import { selectItineraryProfile } from "@/lib/itinerary/page-state";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import { useItineraryStore, type Place, type TimelineSlot } from "@/store/itineraryStore";
import { GoogleMapItinerary } from "@/components/maps/GoogleMapItinerary";
import { TimelineView } from "./TimelineView";
import { MultiDayTabs } from "./MultiDayTabs";

interface ItineraryWorkspaceProps {
  canRenderMap: boolean;
  generatingDayIndex?: number | null;
  onGenerateDay?: (dayIndex: number) => void;
  onPlaceSelect?: (index: number) => void;
  places: ItineraryPlace[];
  placesByDay?: Record<number, ItineraryPlace[]>;
  selectedPlaceIndex?: number | null;
}

const categoryByPlaceType: Record<Place["type"], ItineraryPlace["category"]> = {
  accommodation: "accommodation",
  attraction: "attraction",
  cafe: "cafe",
  custom: "attraction",
  mart: "shopping",
  restaurant: "restaurant",
};

const mealSlotByPlaceType = (type: Place["type"]): ItineraryPlace["mealSlot"] =>
  type === "restaurant" ? "meal" : type === "cafe" ? "snack" : "none";

const createFallbackItineraryPlace = (slot: TimelineSlot, index: number): ItineraryPlace | null => {
  if (slot.itineraryPlace) return slot.itineraryPlace;

  const place = slot.place;
  if (!place?.location) return null;

  return {
    category: categoryByPlaceType[place.type] ?? "attraction",
    description: place.description ?? "?ъ슜?먭? ?쇱젙??異붽????μ냼?낅땲??",
    endTime: slot.endTime ?? "",
    estimatedCost: "?뺤떎???뺣낫 ?놁쓬",
    estimatedMinutes: 60,
    koName: place.name,
    lat: place.location.lat,
    lng: place.location.lng,
    mealSlot: mealSlotByPlaceType(place.type),
    order: index + 1,
    photoUrl: place.imageUrl,
    placeName: place.name,
    startTime: slot.startTime ?? "",
    theme: place.type,
    travelFromPrevDistance: slot.memo ?? "?뺤떎???뺣낫 ?놁쓬",
    travelFromPrevMinutes: 0,
  };
};

export const ItineraryWorkspace = ({
  canRenderMap,
  generatingDayIndex,
  onGenerateDay,
  onPlaceSelect,
  places,
  placesByDay,
  selectedPlaceIndex,
}: ItineraryWorkspaceProps) => {
  const [activeDay, setActiveDay] = useState(1);
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number | null>(null);
  const days = useItineraryStore((state) => state.days);
  const userProfile = useDiploLifeStore(selectItineraryProfile);
  const activeDayData = days[activeDay];

  const activePlaces = useMemo(() => {
    const generatedPlaces = placesByDay?.[activeDay] ?? [];
    if (generatedPlaces.length > 0) return generatedPlaces;
    if (activeDay === 1 && places.length > 0) return places;

    return (activeDayData?.slots ?? [])
      .map((slot, index) => createFallbackItineraryPlace(slot, index))
      .filter((place): place is ItineraryPlace => place !== null);
  }, [activeDay, activeDayData?.slots, places, placesByDay]);

  useEffect(() => {
    setLocalSelectedIndex(activePlaces.length > 0 ? 0 : null);
  }, [activeDay, activePlaces.length]);

  const visibleSelectedIndex = activeDay === 1 ? selectedPlaceIndex : localSelectedIndex;
  const isGeneratingActiveDay = generatingDayIndex === activeDay;

  const handlePlaceSelect = (index: number) => {
    setLocalSelectedIndex(index);
    if (activeDay === 1) {
      onPlaceSelect?.(index);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <MultiDayTabs activeDay={activeDay} setActiveDay={setActiveDay} />

      <div className="grid min-h-0 flex-1 bg-surface-alt md:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="min-h-[360px] border-b border-border bg-background p-4 md:min-h-0 md:border-b-0 md:border-r">
          {canRenderMap ? (
            <GoogleMapItinerary
              places={activePlaces}
              selectedPlaceIndex={visibleSelectedIndex}
              onPlaceSelect={handlePlaceSelect}
              accommodationLocation={userProfile?.accommodationLocation}
              accommodationLat={userProfile?.accommodationLat}
              accommodationLng={userProfile?.accommodationLng}
              city={userProfile?.city}
            />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 text-center text-sm text-muted-foreground">
              <MapPin className="mb-3 h-10 w-10 opacity-25" />
              Google Maps API Key媛 ?놁뼱 吏?꾨? ?쒖떆?????놁뒿?덈떎.
            </div>
          )}
        </div>

        <div className="custom-scrollbar min-h-0 overflow-y-auto bg-background p-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Day {activeDay} ?쇱젙</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activeDayData?.date}</p>
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              珥?<span className="font-bold text-foreground">{activePlaces.length}</span>媛??μ냼
            </div>
          </div>

          {activePlaces.length > 0 ? (
            <TimelineView
              places={activePlaces}
              selectedIndex={visibleSelectedIndex}
              onSelect={handlePlaceSelect}
            />
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <CalendarX2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <h3 className="text-base font-bold text-foreground">?앹꽦???쇱젙???놁뒿?덈떎</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                ?좏깮???좎쭨???쒖떆??異붿쿇 ?μ냼媛 ?놁뒿?덈떎. ?앹꽦??Day????쓣 ?좏깮?섎㈃ 吏?꾩? ?대룞 寃쎈줈媛 ?④퍡 ?쒖떆?⑸땲??
              </p>
              <button
                type="button"
                onClick={() => onGenerateDay?.(activeDay)}
                disabled={!onGenerateDay || isGeneratingActiveDay}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingActiveDay ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Day {activeDay} ?쇱젙 ?앹꽦 以?                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Day {activeDay} ?쇱젙 ?앹꽦?섍린
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
