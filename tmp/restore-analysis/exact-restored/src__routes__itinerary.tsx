import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { APIProvider } from "@vis.gl/react-google-maps";
import { AlertCircle, ArrowLeft, History, Loader2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateItineraryFn } from "@/lib/gemini/itinerary";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import { useDiploLifeStore, type UserProfile } from "@/lib/diplolife/state";
import {
  createItineraryBudgetPlan,
  type BudgetStrategy,
} from "@/lib/itinerary/budget-plan";
import {
  applyBudgetKrwToItinerarySettings,
  canRequestItinerary,
  createAccommodationProfilePatch,
  createItinerarySettingsProfileKey,
  getItineraryPrerequisiteState,
  getSmartDefaults,
  selectItineraryProfile,
  selectUpdateItineraryProfile,
} from "@/lib/itinerary/page-state";
import { createItineraryStoreSeed } from "@/lib/itinerary/multi-day-state";
import { createDayDiversityProfile } from "@/lib/itinerary/multi-day-diversity";
import { collectItineraryPlaceExclusions } from "@/lib/itinerary/place-deduplication";
import {
  getSoftDurationMinutesForIntensity,
  getTargetPlaceCountForIntensity,
} from "@/lib/itinerary/recommendation-policy";
import { getInitialGenerationDays } from "@/lib/itineraryUtils";
import { useItineraryStore } from "@/store/itineraryStore";
import {
  saveItineraryHistory,
  updateItineraryHistory,
  type ItineraryHistoryRecord,
} from "@/lib/api/itinerary-history";

import { AppShell } from "@/components/diplolife/AppShell";
import {
  LocationSearchInput,
  type ResolvedLocation,
} from "@/components/diplolife/forms/LocationSearchInput";
import { ItineraryWorkspace } from "@/components/itinerary/ItineraryWorkspace";
import { ItineraryBudgetPanel } from "@/components/itinerary/ItineraryBudgetPanel";
import { QuickSettings, type QuickSettingsValues } from "@/components/itinerary/QuickSettings";
import { RecommendationCriteriaPanel } from "@/components/itinerary/RecommendationCriteriaPanel";
import { TimelineView } from "@/components/itinerary/TimelineView";
import { GoogleMapItinerary } from "@/components/maps/GoogleMapItinerary";
import { ItineraryHistorySheet } from "@/components/itinerary/ItineraryHistorySheet";

type ItinerarySearch = {
  budgetKrw?: number;
};

type GeneratedItineraryDay = {
  dayIndex: number;
  places: ItineraryPlace[];
};

type GeneratedItineraryResult = {
  allPlaces: ItineraryPlace[];
  days: GeneratedItineraryDay[];
};

type ItineraryHistoryInput = Omit<ItineraryHistoryRecord, "id" | "created_at">;
type ItineraryExclusions = ReturnType<typeof collectItineraryPlaceExclusions>;

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"];

const budgetLabelByStrategy: Record<BudgetStrategy, string> = {
  balanced: "蹂댄넻",
  experience: "?ъ쑀",
  saving: "???,
};

const parseBudgetKrwSearch = (value: unknown) => {
  const budgetKrw = typeof value === "number" ? value : Number(value);

  return Number.isFinite(budgetKrw) && budgetKrw > 0 ? Math.round(budgetKrw) : undefined;
};

const createPlacesByDayRecord = (days: GeneratedItineraryDay[]) =>
  Object.fromEntries(days.map((day) => [day.dayIndex, day.places]));

const flattenPlacesByDayRecord = (placesByDay: Record<number, ItineraryPlace[]>) =>
  Object.entries(placesByDay)
    .sort(([leftDay], [rightDay]) => Number(leftDay) - Number(rightDay))
    .flatMap(([, dayPlaces]) => dayPlaces);

const normalizeItineraryProfileValue = (value?: string | null) => value?.trim() ?? "";

const koreanRegionNames = new Intl.DisplayNames(["ko"], { type: "region" });

const formatCountryForDisplay = (country?: string | null) => {
  const normalizedCountry = country?.trim();

  if (!normalizedCountry) return "";
  if (!/^[A-Za-z]{2}$/.test(normalizedCountry)) return normalizedCountry;

  try {
    return koreanRegionNames.of(normalizedCountry.toUpperCase()) ?? normalizedCountry;
  } catch {
    return normalizedCountry;
  }
};

const formatDestinationForDisplay = (profile: UserProfile | null | undefined) => {
  const country = formatCountryForDisplay(profile?.country);
  const city = profile?.city?.trim() ?? "";

  return [country, city].filter(Boolean).join(" 쨌 ");
};

const isStoredItineraryForProfile = (
  storeState: ReturnType<typeof useItineraryStore.getState>,
  profile: UserProfile | null | undefined,
) => {
  if (!profile?.country) return false;

  const profileSeed = createItineraryStoreSeed({ profile });

  return (
    normalizeItineraryProfileValue(storeState.destinationCountry) === normalizeItineraryProfileValue(profile.country) &&
    normalizeItineraryProfileValue(storeState.destinationCity) === normalizeItineraryProfileValue(profile.city) &&
    normalizeItineraryProfileValue(storeState.tripStartDate) === normalizeItineraryProfileValue(profileSeed.startDate) &&
    normalizeItineraryProfileValue(storeState.tripEndDate) === normalizeItineraryProfileValue(profileSeed.endDate)
  );
};

const createPlacesByDayRecordFromHistory = (daysData: ItineraryHistoryRecord["days_data"]) =>
  Object.fromEntries(
    Object.values(daysData ?? {})
      .map((day) => [
        day.dayIndex,
        day.slots
          .map((slot) => slot.itineraryPlace)
          .filter((place): place is ItineraryPlace => Boolean(place)),
      ] as const)
      .filter(([, dayPlaces]) => dayPlaces.length > 0),
  );

export const Route = createFileRoute("/itinerary")({
  head: () => ({ meta: [{ title: "AI 留욎땄 ?쇱젙 ??DiploLife" }] }),
  validateSearch: (search: Record<string, unknown>): ItinerarySearch => ({
    budgetKrw: parseBudgetKrwSearch(search.budgetKrw),
  }),
  component: ItineraryPage,
});

function ItineraryPage() {
  const { budgetKrw } = Route.useSearch();
  const userProfile = useDiploLifeStore(selectItineraryProfile);
  const destinationLabel = formatDestinationForDisplay(userProfile);
  const itineraryDescription = destinationLabel ? `?좏깮???ы뻾吏: ${destinationLabel}` : undefined;
  const [isHydrated, setIsHydrated] = useState(false);
  const shellDescription = isHydrated ? itineraryDescription : undefined;
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const markHydrated = () => setIsHydrated(true);
    const unsub = useDiploLifeStore.persist.onFinishHydration(markHydrated);
    if (useDiploLifeStore.persist.hasHydrated()) {
      markHydrated();
    }
    return () => unsub();
  }, []);

  // Hydration 吏곹썑 湲곗〈???앹꽦?대몦 ?쇱젙???덈떎硫?蹂듭썝
  useEffect(() => {
    if (isHydrated && !hasRestoredRef.current) {
      const storeState = useItineraryStore.getState();
      const storeDays = storeState.days;
      
      const currentProfile = useDiploLifeStore.getState().userProfile;
      const shouldResetStoredItinerary = !isStoredItineraryForProfile(storeState, currentProfile);
      
      // 留뚯빟 ?댁쟾 踰꾩쟾???앹꽦?섏뼱 ??λ맂 ?꾩떆 ?뺣낫媛 ?녾굅?? ?꾩옱 ?ㅼ젙???꾩떆? ?ㅻⅤ?ㅻ㈃ 由ъ뀑?⑸땲??
      if (shouldResetStoredItinerary) {
        hasRestoredRef.current = true;
        
        // ?ㅽ넗?대룄 ???꾩떆??留욊쾶 諛깆? ?곹깭濡?珥덇린?뷀빀?덈떎.
        if (currentProfile?.country) {
          const profileSeed = createItineraryStoreSeed({ profile: currentProfile });
          useItineraryStore.getState().initializeTrip(
            profileSeed.startDate,
            profileSeed.endDate,
            [],
            currentProfile.city,
            currentProfile.country,
          );
        }
        
        // 吏???곹깭 珥덇린??        setPlaces([]);
        setPlaces([]);
        setPlacesByDay({});
        setResultView("map");
        setSavedHistoryId(null);
        return;
      }

      if (storeDays && Object.keys(storeDays).length > 0) {
        const hasGeneratedDay = Object.values(storeDays).some(day => day.isGenerated);
        if (hasGeneratedDay) {
          const restoredPlacesByDay = createPlacesByDayRecordFromHistory(storeDays);
          const restoredPlaces = flattenPlacesByDayRecord(restoredPlacesByDay);
          
          if (restoredPlaces.length > 0) {
            setPlacesByDay(restoredPlacesByDay);
            setPlaces(restoredPlaces);
            // ?쇱젙 ?곗씠?곌? ?덉쑝硫?留?酉?????뚰겕?ㅽ럹?댁뒪 酉곕줈 蹂듭썝
            setResultView("workspace");
            setSelectedIndex(0);
          }
        }
      }
      hasRestoredRef.current = true;
    }
  }, [isHydrated]);
  const updateUserProfile = useDiploLifeStore(selectUpdateItineraryProfile);
  const costInsight = useDiploLifeStore((state) => state.costInsight);
  const exchangeRate = useDiploLifeStore((state) => state.dashboard.exchangeRate);
  const fetchCostEstimationData = useDiploLifeStore((state) => state.fetchCostEstimationData);
  const setTotalBudgetKrw = useDiploLifeStore((state) => state.setTotalBudgetKrw);
  const initializeTrip = useItineraryStore((state) => state.initializeTrip);
  const generateDay = useItineraryStore((state) => state.generateDay);

  const [places, setPlaces] = useState<ItineraryPlace[]>([]);
  const [placesByDay, setPlacesByDay] = useState<Record<number, ItineraryPlace[]>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [resultView, setResultView] = useState<"map" | "workspace">("map");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const activeHistoryIdRef = useRef<string | null>(null);
  const historySavePromiseRef = useRef<Promise<ItineraryHistoryRecord | null> | null>(null);
  const [settings, setSettings] = useState<QuickSettingsValues>(() =>
    applyBudgetKrwToItinerarySettings(getSmartDefaults(userProfile), budgetKrw),
  );
  const [tempLocation, setTempLocation] = useState(userProfile?.accommodationLocation || "");
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const itinerarySettingsProfileKey = createItinerarySettingsProfileKey(userProfile);
  const profileDefaultSettings = useMemo(
    () => applyBudgetKrwToItinerarySettings(getSmartDefaults(userProfile), budgetKrw),
    [itinerarySettingsProfileKey, budgetKrw],
  );

  useEffect(() => {
    setSettings(profileDefaultSettings);
  }, [profileDefaultSettings]);

  useEffect(() => {
    if (userProfile?.accommodationLocation) {
      setTempLocation(userProfile.accommodationLocation);
    }
  }, [userProfile?.accommodationLocation]);

  useEffect(() => {
    if (budgetKrw && budgetKrw !== costInsight.totalBudgetKrw) {
      setTotalBudgetKrw(budgetKrw);
    }
  }, [budgetKrw, costInsight.totalBudgetKrw, setTotalBudgetKrw]);

  const prerequisite = getItineraryPrerequisiteState(userProfile);
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const hasAccommodationCoords =
    typeof userProfile?.accommodationLat === "number" &&
    Number.isFinite(userProfile.accommodationLat) &&
    typeof userProfile?.accommodationLng === "number" &&
    Number.isFinite(userProfile.accommodationLng);
  const canRenderMap = Boolean(
    mapsApiKey && (places.length > 0 || userProfile?.accommodationLocation || hasAccommodationCoords),
  );
  const budgetPlan = useMemo(
    () =>
      createItineraryBudgetPlan({
        budgetStrategy: settings.budgetStrategy,
        costAnalysis: costInsight.analysis,
        exchangeRate,
        profile: userProfile,
        totalBudgetKrw: costInsight.totalBudgetKrw,
      }),
    [
      costInsight.analysis,
      costInsight.totalBudgetKrw,
      exchangeRate.fromCurrency,
      exchangeRate.rate,
      settings.budgetStrategy,
      userProfile?.stayEndDate,
      userProfile?.stayPurpose,
      userProfile?.stayStartDate,
    ],
  );

  const handleLocationTextChange = (nextValue: string) => {
    setTempLocation(nextValue);
    if (resolvedLocation?.address !== nextValue) {
      setResolvedLocation(null);
    }
  };

  const handleResolvedLocation = (location: ResolvedLocation) => {
    setTempLocation(location.address);
    setResolvedLocation(location);
  };

  const saveLocation = async () => {
    const nextLocation = tempLocation.trim();
    if (!nextLocation) return;
    const hasResolvedCoordinates =
      resolvedLocation?.address === nextLocation &&
      Number.isFinite(resolvedLocation?.lat) &&
      Number.isFinite(resolvedLocation?.lng);

    await updateUserProfile(
      createAccommodationProfilePatch(userProfile, {
        lat: hasResolvedCoordinates && resolvedLocation ? resolvedLocation.lat : undefined,
        lng: hasResolvedCoordinates && resolvedLocation ? resolvedLocation.lng : undefined,
        location: nextLocation,
      }),
    );
  };

  const handleBudgetChange = (nextBudgetKrw: number) => {
    setTotalBudgetKrw(Number.isFinite(nextBudgetKrw) && nextBudgetKrw > 0 ? Math.round(nextBudgetKrw) : 0);
  };

  const handleBudgetRefresh = () => {
    void fetchCostEstimationData(true);
  };

  const handleBudgetStrategyChange = (budgetStrategy: BudgetStrategy) => {
    setSettings((current) => {
      const nextSettings = {
        ...current,
        budget: budgetLabelByStrategy[budgetStrategy],
        budgetStrategy,
      };
      void updateUserProfile({
        preferredItineraryIntensity: nextSettings.itineraryIntensity,
        preferredTravelModes: nextSettings.travelModes,
        preferredStartTime: nextSettings.startTime,
        preferredBudgetStrategy: nextSettings.budgetStrategy,
      });
      return nextSettings;
    });
  };

  const handleSettingsChange = (newSettings: QuickSettingsValues) => {
    setSettings(newSettings);
    void updateUserProfile({
      preferredItineraryIntensity: newSettings.itineraryIntensity,
      preferredTravelModes: newSettings.travelModes,
      preferredStartTime: newSettings.startTime,
      preferredBudgetStrategy: newSettings.budgetStrategy,
    });
  };

  const collectExcludedPlacesBeforeDay = (dayIndex: number) => {
    const previousDayPlaces = Object.entries(placesByDay)
      .filter(([rawDayIndex]) => Number(rawDayIndex) < dayIndex)
      .sort(([leftDay], [rightDay]) => Number(leftDay) - Number(rightDay))
      .flatMap(([, dayPlaces]) => dayPlaces);

    if (previousDayPlaces.length > 0) return previousDayPlaces;

    return dayIndex === 1 || Object.keys(placesByDay).length === 0 ? places : [];
  };

  const createDayGenerationPayload = (
    dayIndex: number,
    exclusions: ItineraryExclusions = collectItineraryPlaceExclusions(
      collectExcludedPlacesBeforeDay(dayIndex),
    ),
  ) => {
    if (!userProfile?.country) {
      throw new Error("援?? ?ㅼ젙???꾩슂?⑸땲??");
    }

    const tripRange = createItineraryStoreSeed({ profile: userProfile });
    const dayDiversity = createDayDiversityProfile({
      city: userProfile.city,
      country: userProfile.country,
      dayIndex,
      durationDays: tripRange.durationDays,
    });

    return {
      country: userProfile.country,
      city: userProfile.city,
      accommodationAddress: userProfile.accommodationLocation,
      accommodationLat: userProfile.accommodationLat,
      accommodationLng: userProfile.accommodationLng,
      budget: settings.budget,
      budgetPlan,
      dayIndex,
      dayThemeHint: dayDiversity.dayThemeHint,
      durationMinutes: getSoftDurationMinutesForIntensity(settings.itineraryIntensity),
      excludedGooglePlaceIds: exclusions.excludedGooglePlaceIds,
      excludedPlaceNames: exclusions.excludedPlaceNames,
      startTime: settings.startTime,
      targetPlaceCount: getTargetPlaceCountForIntensity(settings.itineraryIntensity),
      travelModes: settings.travelModes,
      tripDurationDays: tripRange.durationDays,
    };
  };

  const createHistoryRecord = (
    historyPlaces: ItineraryPlace[],
    itinerarySeed: ReturnType<typeof createItineraryStoreSeed>,
  ): ItineraryHistoryInput | null => {
    if (!userProfile?.country) return null;

    return {
      user_id: userProfile.id,
      destination_country: userProfile.country,
      destination_city: userProfile.city,
      start_date: itinerarySeed.startDate,
      end_date: itinerarySeed.endDate,
      duration_days: itinerarySeed.durationDays,
      budget_krw: costInsight.totalBudgetKrw,
      accommodation_location: userProfile.accommodationLocation,
      places_data: historyPlaces,
      days_data: useItineraryStore.getState().days,
    };
  };

  const setSavedHistoryId = (historyId: string | null | undefined) => {
    const nextHistoryId = historyId ?? null;
    activeHistoryIdRef.current = nextHistoryId;
    setActiveHistoryId(nextHistoryId);
  };

  const persistItineraryHistory = async (
    record: ItineraryHistoryInput,
    options: { mode?: "insert" | "update-current" } = {},
  ) => {
    if (options.mode === "insert") {
      setSavedHistoryId(null);
      const savePromise = saveItineraryHistory(record);
      historySavePromiseRef.current = savePromise;
      const savedHistory = await savePromise;
      setSavedHistoryId(savedHistory.id);
      return savedHistory;
    }

    let historyId = activeHistoryIdRef.current;
    if (!historyId && historySavePromiseRef.current) {
      const pendingHistory = await historySavePromiseRef.current.catch(() => null);
      historyId = pendingHistory?.id ?? activeHistoryIdRef.current;
    }

    if (historyId) {
      const updatedHistory = await updateItineraryHistory(historyId, record);
      setSavedHistoryId(updatedHistory.id ?? historyId);
      return updatedHistory;
    }

    const savedHistory = await saveItineraryHistory(record);
    setSavedHistoryId(savedHistory.id);
    return savedHistory;
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const seedRange = createItineraryStoreSeed({ profile: userProfile });
      const targetDays = getInitialGenerationDays(seedRange.durationDays);
      const generatedDays: GeneratedItineraryDay[] = [];

      for (let dayIndex = 1; dayIndex <= targetDays; dayIndex += 1) {
        const generatedDaysSoFar = [...generatedDays];
        const exclusions = collectItineraryPlaceExclusions(generatedDaysSoFar.flatMap((day) => day.places));
        const dayPlaces = await generateItineraryFn({
          data: createDayGenerationPayload(dayIndex, exclusions),
        });

        generatedDays.push({ dayIndex, places: dayPlaces });
      }

      return {
        allPlaces: generatedDays.flatMap((day) => day.places),
        days: generatedDays,
      } satisfies GeneratedItineraryResult;
    },
    onSuccess: (data) => {
      const itinerarySeed = createItineraryStoreSeed({
        placesByDay: data.days,
        profile: userProfile,
      });

      initializeTrip(
        itinerarySeed.startDate,
        itinerarySeed.endDate,
        itinerarySeed.globalPlaces,
        userProfile?.city,
        userProfile?.country
      );
      itinerarySeed.generatedDays.forEach((day) => generateDay(day.dayIndex, day.slots));
      setPlaces(data.allPlaces);
      setPlacesByDay(createPlacesByDayRecord(data.days));
      setSelectedIndex(0);
      setResultView("workspace");

      const historyRecord = createHistoryRecord(data.allPlaces, itinerarySeed);
      if (historyRecord) {
        persistItineraryHistory(historyRecord, { mode: "insert" }).then(() => {
          toast.success("AI 留욎땄 ?쇱젙???깃났?곸쑝濡??앹꽦?섍퀬 ??λ릺?덉뒿?덈떎.");
        }).catch(err => {
          console.error("Failed to save itinerary history to Supabase:", err);
          toast.error("?쇱젙????ν븯??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
        });
      }
    },
  });

  const dayGenerationMutation = useMutation({
    mutationFn: async (dayIndex: number) => {
      const dayPlaces = await generateItineraryFn({
        data: createDayGenerationPayload(dayIndex),
      });

      return { dayIndex, places: dayPlaces } satisfies GeneratedItineraryDay;
    },
    onSuccess: (generatedDay) => {
      const nextPlacesByDay = {
        ...placesByDay,
        [generatedDay.dayIndex]: generatedDay.places,
      };
      const itinerarySeed = createItineraryStoreSeed({
        placesByDay: [generatedDay],
        profile: userProfile,
      });

      itinerarySeed.generatedDays.forEach((day) => generateDay(day.dayIndex, day.slots));
      const nextPlaces = flattenPlacesByDayRecord(nextPlacesByDay);
      setPlacesByDay(nextPlacesByDay);
      setPlaces(nextPlaces);

      const historyRecord = createHistoryRecord(nextPlaces, itinerarySeed);
      if (historyRecord) {
        persistItineraryHistory(historyRecord).then(() => {
          toast.success(`Day ${generatedDay.dayIndex} ?쇱젙???깃났?곸쑝濡??앹꽦?섍퀬 ??λ릺?덉뒿?덈떎.`);
        }).catch(err => {
          console.error("Failed to update itinerary history in Supabase:", err);
          toast.error("?쇱젙???낅뜲?댄듃?섎뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
        });
      }
    },
  });
  const pendingDayGenerationIndex = dayGenerationMutation.isPending
    ? dayGenerationMutation.variables ?? null
    : null;

  const shouldShowWorkspace = places.length > 0 && resultView === "workspace";

  const handleGenerateDay = (dayIndex: number) => {
    if (placesByDay[dayIndex]?.length || dayGenerationMutation.isPending) return;

    dayGenerationMutation.mutate(dayIndex);
  };

  const handleShowMapRoute = () => {
    setResultView("workspace");
    // 紐⑤컮???깆뿉???붾㈃ ?ㅽ겕濡?泥섎━
    const mapElement = document.getElementById("itinerary-map-container");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBackToItinerarySettings = () => {
    setPlaces([]);
    setPlacesByDay({});
    setSelectedIndex(null);
    setSavedHistoryId(null);

    if (userProfile?.country) {
      const profileSeed = createItineraryStoreSeed({ profile: userProfile });
      initializeTrip(
        profileSeed.startDate,
        profileSeed.endDate,
        [],
        userProfile.city,
        userProfile.country,
      );
    }

    setResultView("map");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleHistorySelect = (history: ItineraryHistoryRecord) => {
    // ?ㅽ넗???낅뜲?댄듃 (history load)
    useItineraryStore.getState().loadFromHistory(history);
    
    // 濡쒖뺄 酉??곹깭 ?낅뜲?댄듃
    setPlaces(history.places_data || []);
    setPlacesByDay(createPlacesByDayRecordFromHistory(history.days_data));
    setSelectedIndex(0);
    setResultView("workspace");
    setActiveHistoryId(history.id ?? null);
    activeHistoryIdRef.current = history.id ?? null;
    
    // ??꾨씪???깆뿉???ъ슜?섎뒗 costInsight.totalBudgetKrw ?낅뜲?댄듃 (?꾩슂??寃쎌슦)
    if (history.budget_krw) {
      setTotalBudgetKrw(history.budget_krw);
    }
    setIsHistoryOpen(false);
  };

  if (!isHydrated) {
    return (
      <AppShell eyebrow="AI Itinerary" title="AI 留욎땄 ?쇱젙" description={shellDescription}>
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-border bg-background p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!prerequisite.canGenerate) {
    return (
      <AppShell eyebrow="AI Itinerary" title="AI 留욎땄 ?쇱젙" description={shellDescription}>
        <div className="rounded-2xl border border-border bg-background p-8">
          <div className="mx-auto flex max-w-xl flex-col items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">泥대쪟 ?뺣낫媛 ?꾩슂?⑸땲??/h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{prerequisite.message}</p>
            </div>
            <Link
              to="/onboarding"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              泥대쪟 ?뺣낫 癒쇱? ?ㅼ젙?섍린
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const workspaceContent = (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleBackToItinerarySettings}
        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="?쇱젙 ?몃? ?ㅼ젙 ?붾㈃?쇰줈 ?뚯븘媛湲?
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        ?몃? ?ㅼ젙?쇰줈 ?뚯븘媛湲?      </button>
      <div className="min-h-[720px] overflow-hidden rounded-2xl border border-border bg-background lg:h-[calc(100vh-17rem)]">
        <ItineraryWorkspace
          canRenderMap={Boolean(mapsApiKey)}
          generatingDayIndex={pendingDayGenerationIndex}
          onGenerateDay={handleGenerateDay}
          places={places}
          placesByDay={placesByDay}
          selectedPlaceIndex={selectedIndex}
          onPlaceSelect={setSelectedIndex}
        />
      </div>
    </div>
  );

  const generatorContent = (
    <div className="flex min-h-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-background lg:h-[calc(100vh-14rem)] lg:flex-row">
      <div className="flex min-h-[360px] w-full flex-col overflow-hidden border-b border-border lg:h-full lg:w-[400px] lg:border-b-0 lg:border-r xl:w-[480px]">
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight">?대뵒濡??좊굹蹂쇨퉴??</h1>
              <p className="text-sm text-muted-foreground">
                ?숈냼 ?꾩튂瑜?湲곗??쇰줈 ?대룞 ?숈꽑怨??앹궗 ?쒓컙??諛섏쁺???섎（ ?쇱젙???앹꽦?⑸땲??
              </p>
            </div>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              aria-label="???쇱젙 湲곕줉 蹂닿린"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">??湲곕줉</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                <MapPin className="h-4 w-4" />
                ?숈냼 ?꾩튂
              </div>
              <LocationSearchInput
                value={tempLocation}
                onChange={handleLocationTextChange}
                onResolvedLocation={handleResolvedLocation}
                loadGoogleMapsScript={!mapsApiKey}
                placeholder="?숈냼 ?대쫫?대굹 二쇱냼瑜??낅젰?섏꽭??
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-5 text-muted-foreground">
                  {Number.isFinite(resolvedLocation?.lat) && Number.isFinite(resolvedLocation?.lng)
                    ? "醫뚰몴媛 ?뺤씤???꾩튂?낅땲??"
                    : "二쇱냼留???ν빐??吏?꾩? 異붿쿇 ?붿쭊?먯꽌 ?ㅼ떆 ?꾩튂瑜??뺤씤?⑸땲??"}
                </p>
                <button
                  type="button"
                  onClick={saveLocation}
                  disabled={!tempLocation.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ???                </button>
              </div>
            </div>

            <ItineraryBudgetPanel
              budgetPlan={budgetPlan}
              budgetValueKrw={costInsight.totalBudgetKrw}
              isRefreshing={costInsight.status === "loading"}
              onBudgetChange={handleBudgetChange}
              onBudgetRefresh={handleBudgetRefresh}
              onStrategyChange={handleBudgetStrategyChange}
            />

            <button
              onClick={() => generateMutation.mutate()}
              disabled={!canRequestItinerary({
                country: userProfile?.country,
                isPending: generateMutation.isPending || dayGenerationMutation.isPending,
              })}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] font-bold text-white shadow-md transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  AI媛 ?쇱젙???ㅺ퀎 以묒엯?덈떎...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  AI 留욎땄 ?쇱젙 ?앹꽦?섍린
                </>
              )}
            </button>

            <QuickSettings values={settings} onChange={handleSettingsChange} />
            <RecommendationCriteriaPanel places={places} budgetPlan={budgetPlan} />

            {!mapsApiKey && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Google Maps API Key媛 ?ㅼ젙?섏? ?딆븯?듬땲?? 吏?꾩? 吏?ㅼ퐫??湲곕뒫留?鍮꾪솢?깊솕?⑸땲??</span>
              </div>
            )}
          </div>

          {generateMutation.isError && (
            <div className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
              ?쇱젙 ?앹꽦 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?섏꽭??
            </div>
          )}

          {places.length > 0 && !shouldShowWorkspace && (
            <div className="mt-8 border-t border-border pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">異붿쿇 ?쇱젙</h2>
              </div>
              <TimelineView 
                places={places} 
                selectedIndex={selectedIndex} 
                onSelect={setSelectedIndex} 
                onShowMapRoute={handleShowMapRoute}
              />
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[420px] flex-1 bg-surface-alt p-4 lg:h-full" id="itinerary-map-container">
        {shouldShowWorkspace ? (
          <div className="h-full overflow-hidden rounded-2xl border border-border bg-background">
            <ItineraryWorkspace
              canRenderMap={Boolean(mapsApiKey)}
              generatingDayIndex={pendingDayGenerationIndex}
              onGenerateDay={handleGenerateDay}
              places={places}
              placesByDay={placesByDay}
              selectedPlaceIndex={selectedIndex}
              onPlaceSelect={setSelectedIndex}
            />
          </div>
        ) : canRenderMap ? (
            <GoogleMapItinerary
              places={places}
              selectedPlaceIndex={selectedIndex}
              onPlaceSelect={setSelectedIndex}
              accommodationLocation={userProfile?.accommodationLocation}
              accommodationLat={userProfile?.accommodationLat}
              accommodationLng={userProfile?.accommodationLng}
              city={userProfile?.city}
            />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 text-muted-foreground">
            <MapPin className="mb-4 h-12 w-12 opacity-20" />
            <p>
              {mapsApiKey
                ? "?숈냼瑜??깅줉?섍굅??AI 留욎땄 ?쇱젙???앹꽦?섎㈃ 吏?꾩? ?숈꽑???쒖떆?⑸땲??"
                : "Google Maps API Key媛 ?놁뼱 吏?꾨? ?쒖떆?????놁뒿?덈떎."}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const itineraryContent = shouldShowWorkspace ? workspaceContent : generatorContent;

  return (
    <AppShell eyebrow="AI Itinerary" title="AI 留욎땄 ?쇱젙" description={shellDescription}>
      {mapsApiKey ? (
        <APIProvider apiKey={mapsApiKey} libraries={GOOGLE_MAPS_LIBRARIES}>
          {itineraryContent}
        </APIProvider>
      ) : (
        itineraryContent
      )}
      
      <ItineraryHistorySheet
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        onSelectHistory={handleHistorySelect}
      />
    </AppShell>
  );
}
