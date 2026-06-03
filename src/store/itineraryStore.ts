import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItineraryPlace } from '@/lib/gemini/schema';

export interface Place {
  id: string;
  name: string;
  type: 'attraction' | 'restaurant' | 'cafe' | 'mart' | 'accommodation' | 'custom';
  description?: string;
  location?: { lat: number; lng: number };
  rating?: number;
  imageUrl?: string;
  // ?듭뀡 ?⑤꼸?대굹 ??꾨씪?몄뿉???곗씪 硫뷀??곗씠??  isFixed?: boolean; // ??젣 遺덇? ?щ? (?? ?숈냼)
}

export interface TimelineSlot {
  id: string;
  placeId: string | null; // null?대㈃ 鍮??щ’(?먮뒗 ?쒗뵆由?
  place?: Place;
  itineraryPlace?: ItineraryPlace;
  startTime?: string; // "09:00"
  endTime?: string;
  slotType: 'mandatory' | 'optional' | 'accommodation_return';
  memo?: string;
}

export interface ItineraryDay {
  dayIndex: number; // 1, 2, 3...
  date: string; // "2026-06-01"
  isGenerated: boolean; // Lazy Loading ?щ? ?먮퀎??  slots: TimelineSlot[];
}

interface ItineraryState {
  // 硫붿씤 ?뺣낫
  tripStartDate: string | null;
  tripEndDate: string | null;
  durationDays: number;
  
  // ?꾩껜 ?μ냼 ? (Global Place Pool)
  globalPlaces: Place[];
  
  // ?좎쭨蹂???꾨씪???곹깭
  days: Record<number, ItineraryDay>;
  
  destinationCity: string | null;
  destinationCountry: string | null;
  
  // Actions
  initializeTrip: (startDate: string, endDate: string, initialPlaces?: Place[], city?: string, country?: string) => void;
  generateDay: (dayIndex: number, slots: TimelineSlot[]) => void;
  addPlaceToGlobal: (place: Place) => void;
  addPlaceToDay: (dayIndex: number, place: Place) => void;
  moveSlot: (fromDay: number, toDay: number, fromIndex: number, toIndex: number) => void;
  removeSlot: (dayIndex: number, slotId: string) => void;
  
  // 怨좎젙 ?쒗뵆由?二쇱엯 ?좏떥
  injectAccommodationReturn: (dayIndex: number) => void;

  // ?덉뒪?좊━ 濡쒕뱶
  loadFromHistory: (historyData: any) => void;
}

export const useItineraryStore = create<ItineraryState>()(
  persist(
    (set, get) => ({
      tripStartDate: null,
      tripEndDate: null,
      durationDays: 0,
      globalPlaces: [],
      days: {},
      destinationCity: null,
      destinationCountry: null,

      initializeTrip: (startDate, endDate, initialPlaces = [], city, country) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // ?쒓컙 ?쒓굅?섍퀬 ?좎쭨 李⑥씠留?怨꾩궛
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const initialDays: Record<number, ItineraryDay> = {};
        for (let i = 1; i <= duration; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i - 1);
          
          initialDays[i] = {
            dayIndex: i,
            date: currentDate.toISOString().split('T')[0],
            isGenerated: false,
            slots: [],
          };
        }

        set({
          tripStartDate: startDate,
          tripEndDate: endDate,
          durationDays: duration,
          globalPlaces: initialPlaces,
          days: initialDays,
          destinationCity: city ?? null,
          destinationCountry: country ?? null,
        });
      },

      generateDay: (dayIndex, slots) => {
        set((state) => ({
          days: {
            ...state.days,
            [dayIndex]: {
              ...state.days[dayIndex],
              isGenerated: true,
              slots,
            },
          },
        }));
      },

      addPlaceToGlobal: (place) => {
        set((state) => {
          if (state.globalPlaces.some((p) => p.id === place.id)) return state;
          return { globalPlaces: [...state.globalPlaces, place] };
        });
      },

      addPlaceToDay: (dayIndex, place) => {
        set((state) => {
          const day = state.days[dayIndex];
          if (!day) return state;

          const alreadyAssigned = day.slots.some((slot) => slot.placeId === place.id);
          if (alreadyAssigned) return state;

          const slot: TimelineSlot = {
            id: `day-${dayIndex}-place-${place.id}`,
            place,
            placeId: place.id,
            slotType: "optional",
          };
          const globalPlaces = state.globalPlaces.some((item) => item.id === place.id)
            ? state.globalPlaces
            : [...state.globalPlaces, place];

          return {
            globalPlaces,
            days: {
              ...state.days,
              [dayIndex]: {
                ...day,
                isGenerated: true,
                slots: [...day.slots, slot],
              },
            },
          };
        });
      },

      moveSlot: (fromDay, toDay, fromIndex, toIndex) => {
        set((state) => {
          const sourceDay = state.days[fromDay];
          const targetDay = state.days[toDay];
          
          if (!sourceDay || !targetDay) return state;

          const sourceSlots = [...sourceDay.slots];
          const targetSlots = fromDay === toDay ? sourceSlots : [...targetDay.slots];
          
          const [movedSlot] = sourceSlots.splice(fromIndex, 1);
          targetSlots.splice(toIndex, 0, movedSlot);

          return {
            days: {
              ...state.days,
              [fromDay]: { ...sourceDay, slots: sourceSlots },
              [toDay]: { ...targetDay, slots: targetSlots },
            },
          };
        });
      },

      injectAccommodationReturn: (dayIndex) => {
        set((state) => {
          const day = state.days[dayIndex];
          if (!day) return state;

          const hasAccommodationReturn = day.slots.some(
            (slot) => slot.slotType === 'accommodation_return'
          );

          if (hasAccommodationReturn) return state;

          const accommodationSlot: TimelineSlot = {
            id: `acc-return-${dayIndex}`,
            placeId: null,
            slotType: 'accommodation_return',
            memo: '?숈냼 蹂듦? 諛??λ낫湲??댁떇',
          };

          return {
            days: {
              ...state.days,
              [dayIndex]: {
                ...day,
                slots: [...day.slots, accommodationSlot],
              },
            },
          };
        });
      },

      removeSlot: (dayIndex, slotId) => {
        set((state) => {
          const day = state.days[dayIndex];
          if (!day) return state;

          const slotToRemove = day.slots.find(s => s.id === slotId);
          // ?ｌ? 耳?댁뒪 1: ?숈냼 蹂듦? ?쒗뵆由?isFixed) ?먮뒗 ?꾩닔 紐낆냼 ??젣 諛⑹?
          if (slotToRemove?.slotType === 'accommodation_return' || slotToRemove?.slotType === 'mandatory') {
            console.warn('?꾩닔 ?쇱젙 ?먮뒗 湲곕낯 ?쒗뵆由우? ??젣?????놁뒿?덈떎.');
            return state;
          }

          return {
            days: {
              ...state.days,
              [dayIndex]: {
                ...day,
                slots: day.slots.filter(s => s.id !== slotId),
              },
            },
          };
        });
      },

      loadFromHistory: (historyData) => {
        set({
          tripStartDate: historyData.start_date,
          tripEndDate: historyData.end_date,
          durationDays: historyData.duration_days,
          globalPlaces: historyData.places_data || [],
          days: historyData.days_data || {},
          destinationCity: historyData.destination_city || null,
          destinationCountry: historyData.destination_country || null,
        });
      },
    }),
    {
      name: 'itinerary-storage',
    }
  )
);
