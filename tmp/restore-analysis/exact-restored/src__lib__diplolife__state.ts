import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDashboardSeedFromProfile } from "./dashboard";
import type {
  CountryPublicData,
  DestinationWeatherForecast,
  RiskLevel,
  WeatherForecastStatus,
} from "./api/types";
import type { CityPriceData, CountryCostOfLiving } from "./api/wherenext";
import type { CostEstimationResult, CostAnalysisContext, CostAnalysisResult } from "./api/gemini-cost";
import { CATEGORY_KO, getKoreanItemName, PURPOSE_PRIORITY_CATEGORIES } from "./cost-translations";
import { getLocalDateKey, resolveExchangeRefreshTimeZone } from "./exchange-rate-refresh";

export type LoadingStatus = "idle" | "loading" | "success" | "error";
export type SafetyLevel = 1 | 2 | 3 | 4;
export type ThemePreference = "light" | "dark" | "system";
export type Language = "ko" | "en";
export type CountryCode = string;
export type VisaType =
  | "STUDENT"
  | "WORK"
  | "TOURIST"
  | "WORKING_HOLIDAY"
  | "RESIDENCE"
  | "UNKNOWN";
export type StayPurpose = "STUDY" | "WORK" | "TRAVEL" | "RESIDENCE" | "VOLUNTEER";
export type Interest = "SAFETY" | "COST" | "VISA" | "EMERGENCY" | "LAW";

export interface NotificationSettings {
  visa: boolean;
  safety: boolean;
  exchangeRate: boolean;
  weather: boolean;
  notices: boolean;
  aiInsight: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  country: CountryCode;
  city?: string;
  visaType: VisaType;
  stayPurpose: StayPurpose;
  stayStartDate: string;
  stayEndDate: string | null;
  interests: Interest[];
  foodPreferences?: string[];
  placeInterests?: string[];
  accommodationLocation?: string;
  accommodationLat?: number;
  accommodationLng?: number;
  onboardingComplete: boolean;
  notificationSettings: NotificationSettings;
  theme: ThemePreference;
  language: Language;
  preferredTravelModes?: string[];
  preferredStartTime?: string;
  preferredItineraryIntensity?: string;
  preferredDurationMinutes?: number;
  preferredBudgetStrategy?: string;
}

export interface StayCountry {
  country: CountryCode;
  city?: string;
  visaType: VisaType;
  stayPurpose: StayPurpose;
  stayStartDate: string;
  stayEndDate: string | null;
}

export interface Incident {
  id: string;
  title: string;
  level: SafetyLevel;
  source: string;
  occurredAt: string;
}

export interface Notice {
  id: string;
  title: string;
  category: "SAFETY" | "VISA" | "LIFE" | "WEATHER" | "SYSTEM";
  source: string;
  publishedAt: string;
  url?: string;
}

export interface DashboardState {
  safetyScore: {
    value: number;
    level: SafetyLevel;
    lastUpdated: string | null;
    incidents: Incident[];
    status: LoadingStatus;
  };
  visaDday: {
    daysRemaining: number | null;
    expiryDate: string | null;
    status: LoadingStatus;
  };
  exchangeRate: {
    fromCurrency: string;
    toCurrency: "KRW";
    rate: number | null;
    changePercent: number | null;
    lastUpdated: string | null;
    status: LoadingStatus;
  };
  notices: {
    items: Notice[];
    status: LoadingStatus;
  };
  aiRecommendation: {
    message: string | null;
    actionUrl: string | null;
    dismissed: boolean;
    status: LoadingStatus;
  };
}

export interface WeatherAlert {
  id: string;
  title: string;
  severity: "info" | "warning" | "danger";
  startsAt: string | null;
  source: string;
  status: LoadingStatus;
}

export interface SOSContact {
  id: string;
  label: string;
  phone: string;
  type: "embassy" | "police" | "medical" | "consular" | "custom";
  availableOffline: boolean;
}

export type BudgetFitLevel = "comfortable" | "moderate" | "tight" | "insufficient";

export interface CostInsight {
  totalBudgetKrw: number;
  cityPrices: CityPriceData | null;
  countryCost: CountryCostOfLiving | null;
  analysis: CostAnalysisResult | null;
  cacheKey: string | null;
  
  // Legacy fields
  userBudget?: number;
  monthlyEstimateKrw: number | null;
  localCurrency: string | null;
  usdToKrwRate: number | null;
  estimationData: CostEstimationResult | null;
  updatedAt: string | null;
  status: LoadingStatus;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
}

export interface Source {
  id: string;
  label: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  sources?: Source[];
  status: "sending" | "sent" | "error";
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
  attachedImage: File | null;
  suggestedQuestions: string[];
  error: string | null;
}

export interface DiploLifeState {
  userProfile: UserProfile | null;
  stayCountry: StayCountry | null;
  dashboard: DashboardState;
  chat: ChatState;
  weatherAlerts: WeatherAlert[];
  weatherForecast: DestinationWeatherForecast | null;
  sos: { contacts: SOSContact[]; selectedType: SOSContact["type"] | null };
  costInsight: CostInsight;
  publicData: CountryPublicData | null;
}

export interface DiploLifeActions {
  completeOnboarding: (profile: UserProfile) => void;
  updateUserProfile: (profilePatch: Partial<UserProfile>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setSafetyScore: (score: DashboardState["safetyScore"]) => void;
  setVisaDday: (visaDday: DashboardState["visaDday"]) => void;
  setExchangeRate: (exchangeRate: DashboardState["exchangeRate"]) => void;
  setNotices: (notices: DashboardState["notices"]) => void;
  setAiRecommendation: (recommendation: DashboardState["aiRecommendation"]) => void;
  setChatInput: (inputValue: string) => void;
  setChatTyping: (isTyping: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessageStatus: (id: string, status: ChatMessage["status"]) => void;
  setSosContacts: (contacts: SOSContact[]) => void;
  setCostInsight: (costInsight: CostInsight) => void;
  setTotalBudgetKrw: (budget: number) => void;
  setPublicData: (data: CountryPublicData | null) => void;
  reset: () => void;
  fetchDashboardData: () => Promise<void>;
  fetchWeatherData: () => Promise<DestinationWeatherForecast | null>;
  fetchCostEstimationData: (force?: boolean) => Promise<void>;
  fetchExchangeRateData: (force?: boolean) => Promise<void>;
  refreshDynamicInsights: () => Promise<void>;
  fetchUserProfileFromSupabase: () => Promise<void>;
  syncUserProfileToSupabase: (profile: UserProfile) => Promise<void>;
}

export type DiploLifeStore = DiploLifeState & DiploLifeActions;

export const COST_INSIGHT_CACHE_TIME_ZONE = "Asia/Seoul";
export const EXCHANGE_RATE_DATA_TTL_MS = 10 * 60 * 1000;

const defaultDashboardState: DashboardState = {
  safetyScore: { value: 0, level: 1, lastUpdated: null, incidents: [], status: "idle" },
  visaDday: { daysRemaining: null, expiryDate: null, status: "idle" },
  exchangeRate: {
    fromCurrency: "USD",
    toCurrency: "KRW",
    rate: null,
    changePercent: null,
    lastUpdated: null,
    status: "idle",
  },
  notices: { items: [], status: "idle" },
  aiRecommendation: { message: null, actionUrl: null, dismissed: false, status: "idle" },
};

export const createDefaultDiploLifeState = (): DiploLifeState => ({
  userProfile: null,
  stayCountry: null,
  dashboard: structuredClone(defaultDashboardState),
  chat: {
    messages: [],
    isTyping: false,
    inputValue: "",
    attachedImage: null,
    suggestedQuestions: ["鍮꾩옄 留뚮즺?쇱쓣 ?뺤씤?댁쨾", "?꾩? 湲닿툒 ?곕씫泥섎? ?뚮젮以?],
    error: null,
  },
  weatherAlerts: [],
  weatherForecast: null,
  sos: { contacts: [], selectedType: null },
  costInsight: {
    totalBudgetKrw: 800000,
    cityPrices: null,
    countryCost: null,
    analysis: null,
    cacheKey: null,
    
    monthlyEstimateKrw: null,
    localCurrency: null,
    usdToKrwRate: null,
    estimationData: null,
    updatedAt: null,
    status: "idle",
  },
  publicData: null,
});

const memoryStorage = (() => {
  const storage = new Map<string, string>();

  return {
    getItem: (name: string) => storage.get(name) ?? null,
    setItem: (name: string, value: string) => {
      storage.set(name, value);
    },
    removeItem: (name: string) => {
      storage.delete(name);
    },
  };
})();

const getDiploLifeStorage = () => {
  if (typeof window === "undefined") return memoryStorage;

  try {
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
};

const toStayCountry = (profile: UserProfile): StayCountry => ({
  country: profile.country,
  city: profile.city,
  visaType: profile.visaType,
  stayPurpose: profile.stayPurpose,
  stayStartDate: profile.stayStartDate,
  stayEndDate: profile.stayEndDate,
});

const defaultWeatherCities: Record<string, string> = {
  AU: "Sydney",
  CA: "Toronto",
  DE: "Berlin",
  GB: "London",
  JP: "Tokyo",
  US: "Washington, D.C.",
};

const countryNames: Record<string, string> = {
  AU: "?몄＜",
  CA: "罹먮굹??,
  DE: "?낆씪",
  GB: "?곴뎅",
  JP: "?쇰낯",
  US: "誘멸뎅",
};

const weatherStatusToLoadingStatus = (status: WeatherForecastStatus): LoadingStatus => {
  if (status === "failed" || status === "geocode_empty") return "error";

  return "success";
};

const weatherRiskToSeverity = (
  status: WeatherForecastStatus,
  riskLevel: RiskLevel,
): WeatherAlert["severity"] => {
  if (status === "failed" || status === "geocode_empty" || riskLevel === "HIGH") return "danger";
  if (status === "partial" || status === "out_of_range") return "warning";
  if (riskLevel === "WATCH" || riskLevel === "CAUTION") return "warning";

  return "info";
};

const createWeatherAlertsFromForecast = (
  forecast: DestinationWeatherForecast,
): WeatherAlert[] => [
  {
    id: `weather-${forecast.destinationId}`,
    title: forecast.notices?.[0] ?? forecast.summary,
    severity: weatherRiskToSeverity(forecast.status, forecast.riskLevel),
    startsAt: forecast.fetchedAt,
    source: "Open-Meteo",
    status: weatherStatusToLoadingStatus(forecast.status),
  },
];

const createWeatherDestination = (stayCountry: StayCountry) => ({
  id: "curr",
  tripId: "curr",
  countryIsoAlp2: stayCountry.country,
  countryNm: countryNames[stayCountry.country] ?? stayCountry.country,
  cities: [stayCountry.city || defaultWeatherCities[stayCountry.country] || stayCountry.country],
  arrivalDate: stayCountry.stayStartDate,
  departureDate: stayCountry.stayEndDate ?? undefined,
});

const normalizeCacheSegment = (value: string | number | null | undefined) =>
  String(value ?? "none").trim().toLowerCase();

export const createCostInsightCacheKey = ({
  stayCountry,
  totalBudgetKrw,
  userProfile,
}: {
  stayCountry: StayCountry;
  totalBudgetKrw: number;
  userProfile: UserProfile;
}) =>
  [
    "cost-insight",
    normalizeCacheSegment(stayCountry.country),
    normalizeCacheSegment(stayCountry.city ?? userProfile.city),
    normalizeCacheSegment(userProfile.stayPurpose),
    normalizeCacheSegment(userProfile.stayStartDate),
    normalizeCacheSegment(userProfile.stayEndDate),
    normalizeCacheSegment(totalBudgetKrw),
  ].join(":");

const toCacheDateKey = (date: Date | string, timeZone = COST_INSIGHT_CACHE_TIME_ZONE) => {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  if (!Number.isFinite(parsedDate.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(parsedDate);
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

export const isCostInsightCacheFresh = ({
  cacheKey,
  costInsight,
  now = new Date(),
}: {
  cacheKey: string;
  costInsight: CostInsight;
  now?: Date;
}) =>
  costInsight.status === "success" &&
  costInsight.cacheKey === cacheKey &&
  costInsight.analysis !== null &&
  costInsight.updatedAt !== null &&
  toCacheDateKey(costInsight.updatedAt) === toCacheDateKey(now);

export const isExchangeRateCacheFresh = ({
  exchangeRate,
  expectedCurrency,
  now,
  nowMs,
  timeZone = COST_INSIGHT_CACHE_TIME_ZONE,
}: {
  exchangeRate: DashboardState["exchangeRate"];
  expectedCurrency: string;
  now?: Date;
  nowMs?: number;
  timeZone?: string;
}) => {
  if (exchangeRate.status !== "success") return false;
  if (exchangeRate.fromCurrency !== expectedCurrency) return false;
  if (exchangeRate.rate === null || exchangeRate.lastUpdated === null) return false;

  const updatedAtMs = Date.parse(exchangeRate.lastUpdated);
  if (!Number.isFinite(updatedAtMs)) return false;

  const nowDate = now ?? new Date(nowMs ?? Date.now());

  return (
    nowDate.getTime() - updatedAtMs <= EXCHANGE_RATE_DATA_TTL_MS &&
    getLocalDateKey(new Date(updatedAtMs), timeZone) === getLocalDateKey(nowDate, timeZone)
  );
};

const toPositiveRateOrNull = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

const resolveUsdToKrwRate = async ({
  currentCurrency,
  currentRate,
}: {
  currentCurrency: string;
  currentRate: number | null | undefined;
}) => {
  const normalizedCurrency = currentCurrency.trim().toUpperCase();
  const normalizedCurrentRate = toPositiveRateOrNull(currentRate);
  if (normalizedCurrency === "USD") return normalizedCurrentRate;

  try {
    const { fetchExchangeRate } = await import("./api/exchange-rate");
    const usdExchangeResult = await fetchExchangeRate("USD");

    return toPositiveRateOrNull(usdExchangeResult?.rate);
  } catch (error) {
    console.error("USD exchange rate fetch failed", error);
    return null;
  }
};

const fallbackBudgetDistribution: Record<
  StayPurpose,
  CostAnalysisResult["dailyBudget"]
> = {
  RESIDENCE: { accommodation: 45, activity: 10, food: 25, total: 100, transport: 20 },
  STUDY: { accommodation: 45, activity: 10, food: 25, total: 100, transport: 20 },
  TRAVEL: { accommodation: 35, activity: 20, food: 30, total: 100, transport: 15 },
  VOLUNTEER: { accommodation: 40, activity: 10, food: 30, total: 100, transport: 20 },
  WORK: { accommodation: 40, activity: 15, food: 25, total: 100, transport: 20 },
};

function createFallbackCostAnalysis(context: CostAnalysisContext): CostAnalysisResult {
  const distribution =
    fallbackBudgetDistribution[context.userProfile.stayPurpose] ?? fallbackBudgetDistribution.TRAVEL;
  const stayDays = Math.max(1, context.userProfile.stayDays);
  const exchangeRate =
    Number.isFinite(context.exchangeRate) && context.exchangeRate > 0 ? context.exchangeRate : 1;
  const dailyTotal = Math.max(
    0,
    Math.round(context.userProfile.totalBudgetKrw / stayDays / exchangeRate),
  );
  const cityPrices = context.cityPrices ?? [];
  const currency = context.targetCurrency;
  const referenceItem = selectReferencePriceItem(cityPrices, context.userProfile.stayPurpose);
  const referencePrice = referenceItem
    ? `${Number(referenceItem.price_local).toLocaleString("ko-KR")} ${currency}`
    : null;
  const referenceItemName = referenceItem ? getKoreanItemName(referenceItem.item) : null;
  const categoryLabel = referenceItem
    ? (CATEGORY_KO[referenceItem.category] ?? referenceItem.category)
    : "?앺솢鍮?;

  const savingTips = [
    referenceItem && referencePrice && referenceItemName
      ? `${referenceItemName} 湲곗? 媛寃⑹? ${referencePrice}?낅땲?? 媛숈? ?덈ぉ??援щℓ??????湲덉븸??湲곗??좎쑝濡?鍮꾧탳?섏꽭??`
      : null,
    context.countryCost
      ? `${context.countryCost.entity.name} ?앺솢鍮?吏?섎뒗 ${context.countryCost.data.costIndex}?낅땲?? ???앺솢鍮?異붿젙移섎뒗 1??${context.countryCost.data.monthlyEstimate.singlePerson.toLocaleString("ko-KR")} ${context.countryCost.data.monthlyEstimate.currency} 湲곗??낅땲??`
      : null,
    `?꾩옱 ?섏쑉 湲곗? 1 ${currency} = ${exchangeRate.toLocaleString("ko-KR")} KRW濡?怨꾩궛?덉뒿?덈떎. 寃곗젣 ???깆쓽 ?섏쑉 媛깆떊媛믪쓣 ?ㅼ떆 ?뺤씤?섏꽭??`,
  ].filter((tip): tip is string => Boolean(tip));

  return {
    budgetComment:
      referenceItem && referencePrice && referenceItemName
        ? `Gemini 遺꾩꽍 ?묐떟???놁뼱 ?낅젰 ?덉궛怨??섏쑉 湲곗??쇰줈 ?꾩떆 遺꾨같?덉뒿?덈떎. ${referenceItemName} ${referencePrice} ??WhereNext ?덈ぉ 媛寃⑹? ?좎??⑸땲??`
        : "Gemini 遺꾩꽍 ?묐떟???놁뼱 ?낅젰 ?덉궛怨??섏쑉 湲곗??쇰줈 ?꾩떆 ?쇱씪 ?덉궛???곗텧?덉뒿?덈떎.",
    dailyBudget: {
      accommodation: Math.round((dailyTotal * distribution.accommodation) / 100),
      activity: Math.round((dailyTotal * distribution.activity) / 100),
      food: Math.round((dailyTotal * distribution.food) / 100),
      total: dailyTotal,
      transport: Math.round((dailyTotal * distribution.transport) / 100),
    },
    recommendations: [
      {
        category: referenceItem?.category ?? "Budget",
        description:
          referenceItem && referencePrice && referenceItemName
            ? `WhereNext ${categoryLabel} ?곗씠?곗뿉 ${referenceItemName} ${referencePrice}媛 ?뺤씤?⑸땲?? 媛숈? 移댄뀒怨좊━ 吏異쒖? ??湲곗? 媛寃⑸낫???믪?吏 癒쇱? 鍮꾧탳?섏꽭??`
            : "?꾩떆蹂??덈ぉ 媛寃⑹씠 ?녿뒗 ?곹깭?낅땲?? 援?? ?앺솢鍮?媛쒖슂? ?낅젰 ?덉궛 湲곗????꾩떆 遺꾨같留??ъ슜?섏꽭??",
        estimatedSaving: "?덇컧???곗젙 遺덇?",
        title:
          referenceItem && referenceItemName
            ? `${referenceItemName} 湲곗??좎쑝濡?${categoryLabel} 吏異??먭?`
            : "?곗씠??怨듬갚 ???덉궛 ?곹븳 癒쇱? 怨좎젙",
      },
    ],
    savingTips,
  };
}

function selectReferencePriceItem(
  cityPrices: NonNullable<CostAnalysisContext["cityPrices"]>,
  stayPurpose: StayPurpose,
) {
  const priorities = PURPOSE_PRIORITY_CATEGORIES[stayPurpose] ?? [];

  return (
    priorities
      .map((category) => cityPrices.find((item) => item.category === category))
      .find((item): item is (typeof cityPrices)[number] => Boolean(item)) ?? cityPrices[0]
  );
}

export const useDiploLifeStore = create<DiploLifeStore>()(
  persist(
    (set) => ({
      ...createDefaultDiploLifeState(),
  completeOnboarding: (profile) => {
    set((state) => ({
      dashboard: { ...state.dashboard, ...createDashboardSeedFromProfile(profile) },
      userProfile: { ...profile, onboardingComplete: true },
      stayCountry: toStayCountry(profile),
    }));
  },
  updateUserProfile: async (profilePatch) => {
    const currentState = useDiploLifeStore.getState();
    if (!currentState.userProfile) return;

    const updatedProfile = {
      ...currentState.userProfile,
      ...profilePatch,
    };

    set({
      userProfile: updatedProfile,
      stayCountry: toStayCountry(updatedProfile),
    });
  },
  updateNotificationSettings: (settings) => {
    const currentState = useDiploLifeStore.getState();
    if (!currentState.userProfile) return;
    
    const updatedProfile = {
      ...currentState.userProfile,
      notificationSettings: { ...currentState.userProfile.notificationSettings, ...settings },
    };
    
    set({ userProfile: updatedProfile });
  },
  setSafetyScore: (safetyScore) =>
    set((state) => ({ dashboard: { ...state.dashboard, safetyScore } })),
  setVisaDday: (visaDday) => set((state) => ({ dashboard: { ...state.dashboard, visaDday } })),
  setExchangeRate: (exchangeRate) =>
    set((state) => ({ dashboard: { ...state.dashboard, exchangeRate } })),
  setNotices: (notices) => set((state) => ({ dashboard: { ...state.dashboard, notices } })),
  setAiRecommendation: (aiRecommendation) =>
    set((state) => ({ dashboard: { ...state.dashboard, aiRecommendation } })),
  setChatInput: (inputValue) => set((state) => ({ chat: { ...state.chat, inputValue } })),
  setChatTyping: (isTyping) => set((state) => ({ chat: { ...state.chat, isTyping } })),
  addChatMessage: (message) =>
    set((state) => {
      if (state.chat.messages.some((m) => m.id === message.id)) return state;
      return { chat: { ...state.chat, messages: [...state.chat.messages, message] } };
    }),
  updateChatMessageStatus: (id, status) =>
    set((state) => ({
      chat: {
        ...state.chat,
        messages: state.chat.messages.map((message) =>
          message.id === id ? { ...message, status } : message,
        ),
      },
    })),
  setSosContacts: (contacts) => set((state) => ({ sos: { ...state.sos, contacts } })),
  setCostInsight: (costInsight) => set({ costInsight }),
  setTotalBudgetKrw: (budget) => set((state) => ({ costInsight: { ...state.costInsight, totalBudgetKrw: budget } })),
  setPublicData: (data) => set({ publicData: data }),
  reset: () => set(createDefaultDiploLifeState()),
  fetchWeatherData: async () => {
    const { stayCountry } = useDiploLifeStore.getState();
    if (!stayCountry) return null;

    set({
      weatherAlerts: [
        {
          id: "weather-loading",
          title: "?좎뵪 ?덈낫 遺덈윭?ㅻ뒗 以?,
          severity: "info",
          startsAt: null,
          source: "Open-Meteo",
          status: "loading",
        },
      ],
    });

    try {
      const { fetchDestinationWeather } = await import("./api/weather");
      const weatherResult = await fetchDestinationWeather({
        destination: createWeatherDestination(stayCountry),
      });

      set({
        weatherForecast: weatherResult,
        weatherAlerts: createWeatherAlertsFromForecast(weatherResult),
      });

      return weatherResult;
    } catch (e) {
      console.error("Weather fetch failed", e);
      set({
        weatherForecast: null,
        weatherAlerts: [
          {
            id: "weather-error",
            title: "Open-Meteo ?덈낫 議고쉶???ㅽ뙣?덉뒿?덈떎.",
            severity: "danger",
            startsAt: new Date().toISOString(),
            source: "Open-Meteo",
            status: "error",
          },
        ],
      });

      return null;
    }
  },
  fetchDashboardData: async () => {
    const { userProfile, stayCountry } = useDiploLifeStore.getState();
    if (!stayCountry || !userProfile) return;

    set((state) => ({
      dashboard: {
        ...state.dashboard,
        safetyScore: { ...state.dashboard.safetyScore, status: "loading" },
        notices: { ...state.dashboard.notices, status: "loading" },
      },
    }));

    try {
      const apiKey = import.meta.env.VITE_DATA_GO_KR_SERVICE_KEY;
      if (!apiKey) throw new Error("API Key missing");

      // Dynamic import to avoid circular dependencies if any, and fetch
      const { fetchPublicDataApi, API_DEFINITIONS, toCountryPublicData } = await import("./api/public-data-adapter");
      const { fetchExchangeRate, getCurrencyCodeForCountry } = await import("./api/exchange-rate");
      
      const p0_apiIds = ["15095500", "15076237", "15076242", "15075354", "15075345"];
      const p1_apiIds = ["15076236", "15099529", "15099532", "15099207"];
      
      const allApiIds = [...p0_apiIds, ...p1_apiIds];
      
      const requests = allApiIds.map(apiId => fetchPublicDataApi({
        definition: API_DEFINITIONS[apiId],
        request: { apiId, countryIsoAlp2: stayCountry.country },
        serviceKey: apiKey
      }));

      // 蹂묐젹 ?붿껌 (?ㅻ쪟媛 諛쒖깮?섎뜑?쇰룄 ?깃났???곗씠?곕쭔 痍⑦빀)
      const results = await Promise.allSettled(requests);
      const successfulResults = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map(r => r.value);

      const parsed = toCountryPublicData(stayCountry.country, "?댁쇅", successfulResults);

      set((state) => {
        const alarm = parsed.travel_alarm;
        const level = (alarm?.alarm_lvl || 1) as SafetyLevel;
        return {
          publicData: parsed,
          dashboard: {
            ...state.dashboard,
            safetyScore: {
              ...state.dashboard.safetyScore,
              status: "success",
              level,
              value: level * 25,
              lastUpdated: alarm?.written_dt || new Date().toISOString(),
            },
            notices: {
              ...state.dashboard.notices,
              status: "success",
              items: alarm?.remark && !["??吏??, "?꾩???, "none"].includes(alarm?.remark.trim()) ? [{
                id: "alarm-1",
                title: alarm.remark,
                category: "SAFETY",
                source: "?멸탳遺 ?ы뻾寃쎈낫",
                publishedAt: alarm.written_dt || new Date().toISOString()
              }] : []
            }
          }
        };
      });

      // ?좏떥由ы떚 API (?섏쑉, ?좎뵪) ?곕룞
      await useDiploLifeStore.getState().fetchExchangeRateData();

    } catch (err) {
      console.error(err);
      set((state) => ({
        dashboard: {
          ...state.dashboard,
          safetyScore: { ...state.dashboard.safetyScore, status: "error" },
          notices: { ...state.dashboard.notices, status: "error" },
        },
      }));
    }
  },
  fetchCostEstimationData: async (force = false) => {
    const { stayCountry, userProfile, costInsight } = useDiploLifeStore.getState();
    if (!stayCountry || !userProfile) return;

    const cacheKey = createCostInsightCacheKey({
      stayCountry,
      totalBudgetKrw: costInsight.totalBudgetKrw,
      userProfile,
    });
    if (!force && isCostInsightCacheFresh({ cacheKey, costInsight })) return;

    set((state) => ({
      costInsight: { ...state.costInsight, status: "loading" },
    }));

    try {
      const { fetchCityPrices, fetchCountryCostOfLiving } = await import("./api/wherenext");
      const { analyzeLivingCost } = await import("./api/gemini-cost");
      
      const cityPrices = await fetchCityPrices({ data: { countryCode: stayCountry.country, cityName: stayCountry.city } });
      const countryCost = await fetchCountryCostOfLiving({ data: { countryCode: stayCountry.country } });

      set((state) => ({
        costInsight: {
          ...state.costInsight,
          cacheKey,
          cityPrices,
          countryCost,
        },
      }));

      const startDate = new Date(userProfile.stayStartDate);
      const endDate = userProfile.stayEndDate ? new Date(userProfile.stayEndDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const stayDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      await useDiploLifeStore.getState().fetchExchangeRateData();
      const currentDashboard = useDiploLifeStore.getState().dashboard;

      const exchangeRate = currentDashboard.exchangeRate.rate || 10;
      const targetCurrency = currentDashboard.exchangeRate.fromCurrency || "USD";
      const usdToKrwRate = await resolveUsdToKrwRate({
        currentCurrency: targetCurrency,
        currentRate: currentDashboard.exchangeRate.rate,
      });

      const analysisContext: CostAnalysisContext = {
        cityPrices: cityPrices?.data,
        countryCost: countryCost || undefined,
        userProfile: {
          stayPurpose: userProfile.stayPurpose,
          stayDays,
          totalBudgetKrw: costInsight.totalBudgetKrw,
          city: userProfile.city,
          country: userProfile.country,
        },
        exchangeRate,
        targetCurrency,
      };
      const analysis =
        (await analyzeLivingCost(analysisContext)) ?? createFallbackCostAnalysis(analysisContext);

      set((state) => ({
        costInsight: {
          ...state.costInsight,
          cityPrices,
          countryCost,
          analysis,
          cacheKey,
          localCurrency: targetCurrency,
          usdToKrwRate,
          status: "success",
          updatedAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error("Cost estimation error:", error);
      set((state) => ({
        costInsight: { ...state.costInsight, status: "error" },
      }));
    }
  },
  refreshDynamicInsights: async () => {
    const { stayCountry, userProfile, costInsight } = useDiploLifeStore.getState();
    if (!stayCountry || !userProfile || !costInsight.cityPrices || !costInsight.countryCost) {
      // ?곗씠?곌? ?녿뒗 ?곹깭硫??꾩껜 媛깆떊 ?몄텧
      return useDiploLifeStore.getState().fetchCostEstimationData(true);
    }

    set((state) => ({
      costInsight: { ...state.costInsight, status: "loading" },
    }));

    try {
      const { analyzeLivingCost } = await import("./api/gemini-cost");
      
      const startDate = new Date(userProfile.stayStartDate);
      const endDate = userProfile.stayEndDate ? new Date(userProfile.stayEndDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const stayDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // ?섏쑉 ?곗씠??媛뺤젣 媛깆떊
      await useDiploLifeStore.getState().fetchExchangeRateData(true);
      const currentDashboard = useDiploLifeStore.getState().dashboard;

      const exchangeRate = currentDashboard.exchangeRate.rate || 10;
      const targetCurrency = currentDashboard.exchangeRate.fromCurrency || "USD";
      const usdToKrwRate = await resolveUsdToKrwRate({
        currentCurrency: targetCurrency,
        currentRate: currentDashboard.exchangeRate.rate,
      });

      // WhereNext API???앸왂?섍퀬 AI 遺꾩꽍留??ы샇異?      const analysisContext: CostAnalysisContext = {
        cityPrices: costInsight.cityPrices.data,
        countryCost: costInsight.countryCost,
        userProfile: {
          stayPurpose: userProfile.stayPurpose,
          stayDays,
          totalBudgetKrw: costInsight.totalBudgetKrw,
          city: userProfile.city,
          country: userProfile.country,
        },
        exchangeRate,
        targetCurrency,
      };
      const analysis =
        (await analyzeLivingCost(analysisContext)) ?? createFallbackCostAnalysis(analysisContext);

      set((state) => ({
        costInsight: {
          ...state.costInsight,
          analysis,
          localCurrency: targetCurrency,
          usdToKrwRate,
          status: "success",
          updatedAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error("Dynamic insights refresh error:", error);
      set((state) => ({
        costInsight: { ...state.costInsight, status: "error" },
      }));
    }
  },
  fetchExchangeRateData: async (force = false) => {
    const { stayCountry } = useDiploLifeStore.getState();
    if (!stayCountry) return;

    const { getCurrencyCodeForCountry } = await import("./api/exchange-rate");
    const currencyCode = getCurrencyCodeForCountry(stayCountry.country) || "USD";
    const currentExchangeRate = useDiploLifeStore.getState().dashboard.exchangeRate;
    const refreshTimeZone = resolveExchangeRefreshTimeZone({
      city: stayCountry.city,
      countryIso2: stayCountry.country,
    });

    if (
      !force &&
      isExchangeRateCacheFresh({
        exchangeRate: currentExchangeRate,
        expectedCurrency: currencyCode,
        timeZone: refreshTimeZone,
      })
    ) {
      return;
    }

    set((state) => ({
      dashboard: {
        ...state.dashboard,
        exchangeRate: { ...state.dashboard.exchangeRate, status: "loading" },
      },
    }));

    try {
      const { fetchExchangeRate } = await import("./api/exchange-rate");
      const exchangeResult = await fetchExchangeRate(currencyCode);
      if (exchangeResult) {
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            exchangeRate: {
              ...state.dashboard.exchangeRate,
              fromCurrency: currencyCode,
              rate: exchangeResult.rate,
              changePercent: exchangeResult.changePercent ?? null,
              lastUpdated: exchangeResult.fetchedAt,
              status: "success"
            }
          }
        }));
      } else {
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            exchangeRate: { ...state.dashboard.exchangeRate, status: "error" },
          },
        }));
      }
    } catch (e) {
      console.error("Exchange rate fetch failed", e);
      set((state) => ({
        dashboard: {
          ...state.dashboard,
          exchangeRate: { ...state.dashboard.exchangeRate, status: "error" },
        },
      }));
    }
  },
  fetchUserProfileFromSupabase: async () => {
    // Profile persistence is local-only until authenticated server storage is implemented.
  },
  syncUserProfileToSupabase: async (_profile: UserProfile) => {
    // Profile persistence is local-only until authenticated server storage is implemented.
  },
    }),
    {
      name: "diplolife-storage",
      storage: createJSONStorage(getDiploLifeStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<DiploLifeState>;
        const persistedDashboard = persisted.dashboard as Partial<DashboardState> | undefined;
        const persistedCostInsight = persisted.costInsight as Partial<CostInsight> | undefined;

        return {
          ...currentState,
          ...persisted,
          costInsight: {
            ...currentState.costInsight,
            ...persistedCostInsight,
            cacheKey: persistedCostInsight?.cacheKey ?? null,
          },
          dashboard: {
            ...currentState.dashboard,
            ...persistedDashboard,
            exchangeRate:
              persistedDashboard?.exchangeRate ?? currentState.dashboard.exchangeRate,
          },
        };
      },
      partialize: (state) => ({
        costInsight: state.costInsight,
        dashboard: {
          exchangeRate: state.dashboard.exchangeRate,
        },
        userProfile: state.userProfile,
        stayCountry: state.stayCountry,
      }),
    }
  )
);
