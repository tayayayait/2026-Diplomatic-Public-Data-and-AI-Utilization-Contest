import { describe, expect, it } from "vitest";
import {
  createDashboardSeedFromProfile,
  createDashboardViewModel,
  type DashboardCardViewModel,
} from "./dashboard";
import {
  createDefaultDiploLifeState,
  type DiploLifeState,
  type UserProfile,
} from "./state";

const profile: UserProfile = {
  id: "user_1",
  name: "민지",
  country: "JP",
  visaType: "STUDENT",
  stayPurpose: "STUDY",
  stayStartDate: "2026-04-01",
  stayEndDate: "2026-06-08",
  interests: ["SAFETY", "COST", "VISA", "EMERGENCY"],
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

const createState = (): DiploLifeState => {
  const base = createDefaultDiploLifeState();

  return {
    ...base,
    userProfile: profile,
    stayCountry: {
      country: "JP",
      visaType: "STUDENT",
      stayPurpose: "STUDY",
      stayStartDate: "2026-04-01",
      stayEndDate: "2026-06-08",
    },
    dashboard: {
      ...base.dashboard,
      safetyScore: {
        value: 82,
        level: 1,
        lastUpdated: "2026-05-29T00:00:00.000Z",
        incidents: [
          {
            id: "incident_1",
            title: "소매치기 주의",
            level: 2,
            source: "외교부",
            occurredAt: "2026-05-28",
          },
        ],
        status: "success",
      },
      visaDday: {
        daysRemaining: 10,
        expiryDate: "2026-06-08",
        status: "success",
      },
      exchangeRate: {
        fromCurrency: "JPY",
        toCurrency: "KRW",
        rate: 9.12,
        changePercent: -0.3,
        lastUpdated: "2026-05-29T00:00:00.000Z",
        status: "success",
      },
      notices: {
        items: [
          {
            id: "notice_1",
            title: "일본 체류 안전 공지",
            category: "SAFETY",
            source: "외교부",
            publishedAt: "2026-05-29T00:00:00.000Z",
          },
        ],
        status: "success",
      },
      aiRecommendation: {
        message: "비자 만료 10일 전입니다. 갱신 서류와 예약 일정을 확인하세요.",
        actionUrl: "/visa",
        dismissed: false,
        status: "success",
      },
    },
    weatherAlerts: [
      {
        id: "weather_1",
        title: "강풍 주의",
        severity: "warning",
        startsAt: "2026-05-29T06:00:00.000Z",
        source: "기상청",
        status: "success",
      },
    ],
  };
};

describe("DiploLife dashboard presenter", () => {
  it("derives visa D-day and a non-Gemini recommendation from profile dates", () => {
    const seed = createDashboardSeedFromProfile(profile, new Date("2026-05-29T00:00:00.000Z"));

    expect(seed.visaDday).toEqual({
      daysRemaining: 10,
      expiryDate: "2026-06-08",
      status: "success",
    });
    expect(seed.aiRecommendation).toMatchObject({
      message: "비자 만료 10일 전입니다. 갱신 서류와 예약 일정을 확인하세요.",
      actionUrl: "/visa",
      dismissed: false,
      status: "success",
    });
  });

  it("returns dashboard cards in the spec-defined order with status-aware values", () => {
    const viewModel = createDashboardViewModel(createState());

    expect(viewModel.title).toBe("안녕하세요, 민지님");
    expect(viewModel.subtitle).toBe("일본 · 유학 · D-10");
    expect(viewModel.cards.map((card) => card.label)).toEqual([
      "안전지수",
      "비자 D-day",
      "환율",
      "날씨",
      "공지",
      "AI 추천",
    ]);
    expect(viewModel.cards.map((card) => [card.label, card.value])).toContainEqual([
      "안전지수",
      "82/100 · 1단계",
    ]);
    expect(viewModel.cards.map((card) => [card.label, card.value])).toContainEqual([
      "환율",
      "1 JPY = ₩9.12",
    ]);
    expect(viewModel.cards.map((card) => [card.label, card.value])).toContainEqual([
      "공지",
      "일본 체류 안전 공지",
    ]);
  });

  it("omits dismissed AI recommendations instead of rendering stale advice", () => {
    const state = createState();
    state.dashboard.aiRecommendation.dismissed = true;

    const labels = createDashboardViewModel(state).cards.map(
      (card: DashboardCardViewModel) => card.label,
    );

    expect(labels).not.toContain("AI 추천");
  });

  it("maps internal loading statuses to Korean display labels", () => {
    const viewModel = createDashboardViewModel(createDefaultDiploLifeState());

    expect(viewModel.cards.map((card) => [card.label, card.statusLabel])).toContainEqual([
      "안전지수",
      "확실한 정보 없음",
    ]);
    expect(viewModel.cards.map((card) => [card.label, card.statusLabel])).not.toContainEqual([
      "안전지수",
      "idle",
    ]);
  });
});
