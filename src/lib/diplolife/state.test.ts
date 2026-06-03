import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCostInsightCacheKey,
  createDefaultDiploLifeState,
  isExchangeRateCacheFresh,
  useDiploLifeStore,
  type ChatMessage,
  type CostAnalysisResult,
  type CostInsight,
  type UserProfile,
} from "./state";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({
      data: null,
      error: { status: 401, message: "Unauthorized" },
    }),
  })),
}));

vi.mock("../supabase", () => ({
  supabase: supabaseMock,
}));

const wherenextMock = vi.hoisted(() => ({
  fetchCityPrices: vi.fn(),
  fetchCountryCostOfLiving: vi.fn(),
}));

vi.mock("./api/wherenext", () => ({
  fetchCityPrices: wherenextMock.fetchCityPrices,
  fetchCountryCostOfLiving: wherenextMock.fetchCountryCostOfLiving,
}));

const geminiCostMock = vi.hoisted(() => ({
  analyzeLivingCost: vi.fn(),
  estimateLivingCost: vi.fn(),
}));

vi.mock("./api/gemini-cost", () => ({
  analyzeLivingCost: geminiCostMock.analyzeLivingCost,
  estimateLivingCost: geminiCostMock.estimateLivingCost,
}));

const exchangeRateMock = vi.hoisted(() => ({
  fetchExchangeRate: vi.fn(),
  getCurrencyCodeForCountry: vi.fn((countryCode: string) =>
    countryCode === "GB" ? "GBP" : "JPY",
  ),
}));

vi.mock("./api/exchange-rate", () => ({
  fetchExchangeRate: exchangeRateMock.fetchExchangeRate,
  getCurrencyCodeForCountry: exchangeRateMock.getCurrencyCodeForCountry,
}));

const profile: UserProfile = {
  id: "user_1",
  name: "?띻만??",
  country: "JP",
  visaType: "STUDENT",
  stayPurpose: "STUDY",
  stayStartDate: "2026-06-01",
  stayEndDate: "2027-05-31",
  interests: ["SAFETY", "COST", "VISA", "EMERGENCY"],
  onboardingComplete: false,
  notificationSettings: {
    visa: true,
    safety: true,
    exchangeRate: true,
    weather: true,
    notices: true,
    aiInsight: false,
  },
  theme: "system",
  language: "ko",
};

const gbProfile: UserProfile = {
  ...profile,
  city: "London",
  country: "GB",
  stayEndDate: "2026-06-30",
  stayPurpose: "WORK",
};

const cachedAnalysis: CostAnalysisResult = {
  budgetComment: "cached budget",
  dailyBudget: {
    accommodation: 150,
    activity: 50,
    food: 100,
    total: 350,
    transport: 50,
  },
  recommendations: [],
  savingTips: [],
};

const refreshedAnalysis: CostAnalysisResult = {
  ...cachedAnalysis,
  budgetComment: "refreshed budget",
};

const cityPrices = {
  data: [],
  metadata: {
    city: "GB-London",
    currency: "GBP",
    data_source: "test",
    exchange_rate: 1,
  },
};

const countryCost = {
  data: {
    breakdown: {},
    costIndex: 70,
    monthlyEstimate: {
      couple: 3200,
      currency: "USD",
      singlePerson: 1800,
    },
    mostAffordableCities: [],
    usComparison: "lower than US",
  },
  entity: { code: "gb", name: "United Kingdom" },
  sources: [],
  summary: "test",
};

const makeCachedCostInsight = (cacheKey: string, updatedAt: string): CostInsight => ({
  ...createDefaultDiploLifeState().costInsight,
  analysis: cachedAnalysis,
  cacheKey,
  cityPrices,
  countryCost,
  status: "success",
  updatedAt,
});

describe("DiploLife state model", () => {
  beforeEach(() => {
    vi.useRealTimers();
    supabaseMock.from.mockClear();
    wherenextMock.fetchCityPrices.mockReset();
    wherenextMock.fetchCountryCostOfLiving.mockReset();
    geminiCostMock.analyzeLivingCost.mockReset();
    geminiCostMock.estimateLivingCost.mockReset();
    exchangeRateMock.fetchExchangeRate.mockReset();
    exchangeRateMock.fetchExchangeRate.mockImplementation(async (currencyCode: string) => ({
      baseCurrency: "KRW",
      fetchedAt: "2026-05-31T09:00:00+09:00",
      rate: currencyCode === "GBP" ? 1800 : currencyCode === "USD" ? 1400 : 10,
      targetCurrency: currencyCode,
    }));
    exchangeRateMock.getCurrencyCodeForCountry.mockClear();
    exchangeRateMock.getCurrencyCodeForCountry.mockImplementation((countryCode: string) =>
      countryCode === "GB" ? "GBP" : "JPY",
    );
    useDiploLifeStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates an idle DiploLife state without Trip-centered fields", () => {
    const state = createDefaultDiploLifeState();

    expect(state.userProfile).toBeNull();
    expect(state.stayCountry).toBeNull();
    expect(state.dashboard.safetyScore.status).toBe("idle");
    expect(state.dashboard.visaDday.status).toBe("idle");
    expect(state.dashboard.exchangeRate.status).toBe("idle");
    expect(state.chat.messages).toEqual([]);
    expect(state.sos.contacts).toEqual([]);
    expect(Object.keys(state)).not.toContain("trip");
    expect(Object.keys(state)).not.toContain("trips");
    expect(Object.keys(state.dashboard)).not.toContain("checklist");
    expect(Object.keys(state)).not.toContain("shareState");
  });

  it("completes onboarding by setting profile and current stay country", () => {
    useDiploLifeStore.getState().completeOnboarding(profile);

    const state = useDiploLifeStore.getState();
    expect(state.userProfile).toMatchObject({ id: "user_1", onboardingComplete: true });
    expect(state.stayCountry).toMatchObject({
      country: "JP",
      stayPurpose: "STUDY",
      stayStartDate: "2026-06-01",
      stayEndDate: "2027-05-31",
    });
  });

  it("updates user profile fields for local itinerary generation", () => {
    useDiploLifeStore.getState().completeOnboarding(profile);
    useDiploLifeStore.getState().updateUserProfile({ accommodationLocation: "Tokyo Station" });

    const state = useDiploLifeStore.getState();
    expect(state.userProfile).toMatchObject({
      id: "user_1",
      onboardingComplete: true,
      accommodationLocation: "Tokyo Station",
    });
    expect(state.stayCountry).toMatchObject({
      country: "JP",
      stayPurpose: "STUDY",
      stayStartDate: "2026-06-01",
      stayEndDate: "2027-05-31",
    });
  });

  it("keeps onboarding profile persistence local by default", async () => {
    await useDiploLifeStore.getState().completeOnboarding(profile);

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("updates dashboard cards with explicit loading statuses", () => {
    useDiploLifeStore.getState().setSafetyScore({
      value: 72,
      level: 2,
      lastUpdated: "2026-05-29T00:00:00.000Z",
      incidents: [
        {
          id: "incident_1",
          title: "?꾩? 吏묓쉶",
          level: 2,
          source: "?멸탳遺",
          occurredAt: "2026-05-28",
        },
      ],
      status: "success",
    });
    useDiploLifeStore.getState().setVisaDday({
      daysRemaining: 42,
      expiryDate: "2026-07-10",
      status: "success",
    });

    const state = useDiploLifeStore.getState();
    expect(state.dashboard.safetyScore).toMatchObject({ value: 72, level: 2, status: "success" });
    expect(state.dashboard.safetyScore.incidents).toHaveLength(1);
    expect(state.dashboard.visaDday).toEqual({
      daysRemaining: 42,
      expiryDate: "2026-07-10",
      status: "success",
    });
  });

  it("tracks chat input, messages, typing state, and message status", () => {
    const message: ChatMessage = {
      id: "msg_1",
      role: "user",
      content: "鍮꾩옄 留뚮즺?쇱쓣 ?뺤씤?댁쨾",
      timestamp: "2026-05-29T00:00:00.000Z",
      status: "sending",
    };

    useDiploLifeStore.getState().setChatInput("鍮꾩옄 留뚮즺?쇱쓣 ?뺤씤?댁쨾");
    useDiploLifeStore.getState().addChatMessage(message);
    useDiploLifeStore.getState().setChatTyping(true);
    useDiploLifeStore.getState().updateChatMessageStatus("msg_1", "sent");

    const state = useDiploLifeStore.getState();
    expect(state.chat.inputValue).toBe("鍮꾩옄 留뚮즺?쇱쓣 ?뺤씤?댁쨾");
    expect(state.chat.isTyping).toBe(true);
    expect(state.chat.messages).toEqual([{ ...message, status: "sent" }]);
  });

  it("keeps a fresh same-day living-cost insight without refetching", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T09:00:00+09:00"));

    useDiploLifeStore.getState().completeOnboarding(gbProfile);
    const state = useDiploLifeStore.getState();
    const cacheKey = createCostInsightCacheKey({
      stayCountry: state.stayCountry!,
      totalBudgetKrw: state.costInsight.totalBudgetKrw,
      userProfile: state.userProfile!,
    });
    useDiploLifeStore
      .getState()
      .setCostInsight(makeCachedCostInsight(cacheKey, "2026-05-31T00:20:00+09:00"));

    await useDiploLifeStore.getState().fetchCostEstimationData();

    expect(wherenextMock.fetchCityPrices).not.toHaveBeenCalled();
    expect(wherenextMock.fetchCountryCostOfLiving).not.toHaveBeenCalled();
    expect(geminiCostMock.analyzeLivingCost).not.toHaveBeenCalled();
    expect(useDiploLifeStore.getState().costInsight.analysis).toBe(cachedAnalysis);
  });

  it("bypasses the living-cost daily cache when refresh is forced", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T09:00:00+09:00"));
    wherenextMock.fetchCityPrices.mockResolvedValue(cityPrices);
    wherenextMock.fetchCountryCostOfLiving.mockResolvedValue(countryCost);
    geminiCostMock.analyzeLivingCost.mockResolvedValue(refreshedAnalysis);

    useDiploLifeStore.getState().completeOnboarding(gbProfile);
    useDiploLifeStore.getState().setExchangeRate({
      changePercent: 0.4,
      fromCurrency: "GBP",
      lastUpdated: "2026-05-31T08:00:00+09:00",
      rate: 1800,
      status: "success",
      toCurrency: "KRW",
    });
    const state = useDiploLifeStore.getState();
    const cacheKey = createCostInsightCacheKey({
      stayCountry: state.stayCountry!,
      totalBudgetKrw: state.costInsight.totalBudgetKrw,
      userProfile: state.userProfile!,
    });
    useDiploLifeStore
      .getState()
      .setCostInsight(makeCachedCostInsight(cacheKey, "2026-05-31T00:20:00+09:00"));

    await useDiploLifeStore.getState().fetchCostEstimationData(true);

    expect(wherenextMock.fetchCityPrices).toHaveBeenCalledTimes(1);
    expect(wherenextMock.fetchCountryCostOfLiving).toHaveBeenCalledTimes(1);
    expect(geminiCostMock.analyzeLivingCost).toHaveBeenCalledTimes(1);
    expect(useDiploLifeStore.getState().costInsight.analysis).toBe(refreshedAnalysis);
  });

  it("keeps fetched cost data visible and uses fallback tips when Gemini analysis is unavailable", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T09:00:00+09:00"));
    const cityPricesWithItems = {
      ...cityPrices,
      data: [
        {
          category: "Restaurants & Cafes",
          item: "Cappuccino",
          price_local: 3.5,
          price_usd: 4.4,
        },
        {
          category: "Transport",
          item: "Monthly transit pass",
          price_local: 156,
          price_usd: 198,
        },
      ],
    };
    wherenextMock.fetchCityPrices.mockResolvedValue(cityPricesWithItems);
    wherenextMock.fetchCountryCostOfLiving.mockResolvedValue(countryCost);
    geminiCostMock.analyzeLivingCost.mockResolvedValue(null);

    useDiploLifeStore.getState().completeOnboarding(gbProfile);
    useDiploLifeStore.getState().setExchangeRate({
      changePercent: 0.4,
      fromCurrency: "GBP",
      lastUpdated: "2026-05-31T08:59:00+09:00",
      rate: 1800,
      status: "success",
      toCurrency: "KRW",
    });

    await useDiploLifeStore.getState().fetchCostEstimationData(true);

    const result = useDiploLifeStore.getState().costInsight;
    expect(result.status).toBe("success");
    expect(result.cityPrices).toBe(cityPricesWithItems);
    expect(result.countryCost).toBe(countryCost);
    expect(result.localCurrency).toBe("GBP");
    expect(result.usdToKrwRate).toBe(1400);
    expect(result.analysis?.recommendations.length).toBeGreaterThan(0);
    expect(result.analysis?.savingTips.length).toBeGreaterThan(0);
  });

  it("keeps a fresh exchange rate only inside the short fxapi TTL or until refresh is forced", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T12:00:00+09:00"));

    useDiploLifeStore.getState().completeOnboarding(gbProfile);
    useDiploLifeStore.getState().setExchangeRate({
      changePercent: 0.2,
      fromCurrency: "GBP",
      lastUpdated: "2026-05-31T11:55:00+09:00",
      rate: 1780,
      status: "success",
      toCurrency: "KRW",
    });

    await useDiploLifeStore.getState().fetchExchangeRateData();

    expect(exchangeRateMock.fetchExchangeRate).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-05-31T12:11:00+09:00"));

    exchangeRateMock.fetchExchangeRate.mockResolvedValue({
      baseCurrency: "KRW",
      fetchedAt: "2026-05-31T12:11:00+09:00",
      rate: 1810,
      targetCurrency: "GBP",
    });

    await useDiploLifeStore.getState().fetchExchangeRateData();

    expect(exchangeRateMock.fetchExchangeRate).toHaveBeenCalledTimes(1);
    expect(useDiploLifeStore.getState().dashboard.exchangeRate.rate).toBe(1810);
  });

  it("stores the actual exchange-rate previous-day change when the API provides it", async () => {
    exchangeRateMock.fetchExchangeRate.mockResolvedValueOnce({
      baseCurrency: "KRW",
      changePercent: -0.42,
      fetchedAt: "2026-05-31T12:11:00+09:00",
      rate: 9.48,
      targetCurrency: "JPY",
    });

    useDiploLifeStore.getState().completeOnboarding(profile);

    await useDiploLifeStore.getState().fetchExchangeRateData(true);

    expect(useDiploLifeStore.getState().dashboard.exchangeRate).toMatchObject({
      changePercent: -0.42,
      fromCurrency: "JPY",
      rate: 9.48,
      status: "success",
    });
  });

  it("does not turn missing exchange-rate change data into a mock 0 percent", async () => {
    exchangeRateMock.fetchExchangeRate.mockResolvedValueOnce({
      baseCurrency: "KRW",
      fetchedAt: "2026-05-31T12:11:00+09:00",
      rate: 9.48,
      targetCurrency: "JPY",
    });

    useDiploLifeStore.getState().completeOnboarding(profile);

    await useDiploLifeStore.getState().fetchExchangeRateData(true);

    expect(useDiploLifeStore.getState().dashboard.exchangeRate.changePercent).toBeNull();
  });

  it("expires the exchange-rate dashboard cache when the destination local date changes", () => {
    expect(
      isExchangeRateCacheFresh({
        exchangeRate: {
          changePercent: 0.2,
          fromCurrency: "JPY",
          lastUpdated: "2026-05-31T14:50:00.000Z",
          rate: 9.1,
          status: "success",
          toCurrency: "KRW",
        },
        expectedCurrency: "JPY",
        now: new Date("2026-05-31T15:01:00.000Z"),
        timeZone: "Asia/Tokyo",
      }),
    ).toBe(false);
  });
});
