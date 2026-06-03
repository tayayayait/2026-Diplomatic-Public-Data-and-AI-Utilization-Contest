import type {
  DashboardState,
  DiploLifeState,
  LoadingStatus,
  UserProfile,
} from "./state";

type DashboardCardId = "safety" | "visa" | "exchange" | "weather" | "notices" | "ai";
type DashboardRoute = "/safety" | "/visa" | "/cost" | "/notices" | "/chat" | "/weather";

export interface DashboardCardViewModel {
  id: DashboardCardId;
  label: string;
  value: string;
  meta: string;
  href: DashboardRoute;
  status: LoadingStatus | "empty";
  statusLabel: string;
}

export interface DashboardViewModel {
  title: string;
  subtitle: string;
  cards: DashboardCardViewModel[];
}

type DashboardPresenterState = Pick<
  DiploLifeState,
  "dashboard" | "stayCountry" | "userProfile" | "weatherAlerts"
>;

interface DashboardSeed {
  visaDday: DashboardState["visaDday"];
  aiRecommendation: DashboardState["aiRecommendation"];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const countryLabels: Record<string, string> = {
  AU: "호주",
  CA: "캐나다",
  DE: "독일",
  GB: "영국",
  JP: "일본",
  US: "미국",
};

const purposeLabels: Record<UserProfile["stayPurpose"], string> = {
  RESIDENCE: "거주",
  STUDY: "유학",
  TRAVEL: "여행",
  VOLUNTEER: "봉사",
  WORK: "근무",
};

const statusLabels: Record<LoadingStatus, string> = {
  error: "데이터를 불러오지 못했습니다",
  idle: "확실한 정보 없음",
  loading: "불러오는 중",
  success: "",
};

const statusBadgeLabels: Record<LoadingStatus | "empty", string> = {
  empty: "없음",
  error: "오류",
  idle: "확실한 정보 없음",
  loading: "불러오는 중",
  success: "정상",
};

const countryLabel = (country: string) => countryLabels[country] ?? country;

const toUtcDateOnly = (isoDate: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month, day);

  return Number.isNaN(timestamp) ? null : timestamp;
};

const differenceInDays = (targetIsoDate: string, now: Date): number | null => {
  const target = toUtcDateOnly(targetIsoDate);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (target === null) return null;

  return Math.ceil((target - today) / MS_PER_DAY);
};

const formatDday = (daysRemaining: number | null) => {
  if (daysRemaining === null) return "확실한 정보 없음";
  if (daysRemaining < 0) return `D+${Math.abs(daysRemaining)}`;

  return `D-${daysRemaining}`;
};

const formatKrw = (rate: number) =>
  new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: rate >= 100 ? 0 : 2,
    minimumFractionDigits: rate >= 100 ? 0 : 2,
  }).format(rate);

const createAiRecommendation = (
  profile: UserProfile,
  daysRemaining: number | null,
): DashboardState["aiRecommendation"] => {
  if (daysRemaining !== null && daysRemaining < 0) {
    return {
      actionUrl: "/visa",
      dismissed: false,
      message: "비자 종료일이 지났습니다. 즉시 체류 자격을 확인하세요.",
      status: "success",
    };
  }

  if (daysRemaining !== null && daysRemaining <= 90) {
    return {
      actionUrl: "/visa",
      dismissed: false,
      message: `비자 만료 ${daysRemaining}일 전입니다. 갱신 서류와 예약 일정을 확인하세요.`,
      status: "success",
    };
  }

  return {
    actionUrl: "/chat",
    dismissed: false,
    message: `${countryLabel(profile.country)} ${purposeLabels[profile.stayPurpose]} 체류 정보를 기준으로 안전, 비자, 생활비 알림을 준비했습니다.`,
    status: "success",
  };
};

export const createDashboardSeedFromProfile = (
  profile: UserProfile,
  now = new Date(),
): DashboardSeed => {
  const daysRemaining =
    profile.stayEndDate === null ? null : differenceInDays(profile.stayEndDate, now);
  const visaDday: DashboardState["visaDday"] =
    profile.stayEndDate === null || daysRemaining === null
      ? { daysRemaining: null, expiryDate: profile.stayEndDate, status: "idle" }
      : { daysRemaining, expiryDate: profile.stayEndDate, status: "success" };

  return {
    aiRecommendation: createAiRecommendation(profile, daysRemaining),
    visaDday,
  };
};

export const createDashboardViewModel = (state: DashboardPresenterState): DashboardViewModel => {
  const { dashboard, stayCountry, userProfile, weatherAlerts } = state;
  const subtitleParts = [
    stayCountry ? countryLabel(stayCountry.country) : null,
    stayCountry ? purposeLabels[stayCountry.stayPurpose] : null,
    formatDday(dashboard.visaDday.daysRemaining),
  ].filter((part): part is string => Boolean(part));
  const cards: DashboardCardViewModel[] = [
    {
      href: "/safety",
      id: "safety",
      label: "안전지수",
      meta:
        dashboard.safetyScore.incidents[0]?.title ??
        (dashboard.safetyScore.status === "success" ? "최근 사건사고 없음" : "외교부 데이터 연결 대기"),
      status: dashboard.safetyScore.status,
      statusLabel: statusBadgeLabels[dashboard.safetyScore.status],
      value:
        dashboard.safetyScore.status === "success"
          ? `${dashboard.safetyScore.value}/100 · ${dashboard.safetyScore.level}단계`
          : statusLabels[dashboard.safetyScore.status],
    },
    {
      href: "/visa",
      id: "visa",
      label: "비자 D-day",
      meta: dashboard.visaDday.expiryDate
        ? `${dashboard.visaDday.expiryDate} 만료`
        : "체류 종료일 미등록",
      status: dashboard.visaDday.status,
      statusLabel: statusBadgeLabels[dashboard.visaDday.status],
      value:
        dashboard.visaDday.status === "success"
          ? formatDday(dashboard.visaDday.daysRemaining)
          : statusLabels[dashboard.visaDday.status],
    },
    {
      href: "/cost",
      id: "exchange",
      label: "환율",
      meta:
        dashboard.exchangeRate.changePercent === null
          ? "변동률 없음"
          : `전일 대비 ${dashboard.exchangeRate.changePercent}%`,
      status: dashboard.exchangeRate.status,
      statusLabel: statusBadgeLabels[dashboard.exchangeRate.status],
      value:
        dashboard.exchangeRate.status === "success" && dashboard.exchangeRate.rate !== null
          ? `1 ${dashboard.exchangeRate.fromCurrency} = ₩${formatKrw(dashboard.exchangeRate.rate)}`
          : statusLabels[dashboard.exchangeRate.status],
    },
    {
      href: "/weather",
      id: "weather",
      label: "날씨",
      meta: weatherAlerts[0]?.source ?? "기상 특보 없음",
      status: weatherAlerts[0]?.status ?? "empty",
      statusLabel: statusBadgeLabels[weatherAlerts[0]?.status ?? "empty"],
      value: weatherAlerts[0]?.title ?? "특보 없음",
    },
    {
      href: "/notices",
      id: "notices",
      label: "공지",
      meta:
        dashboard.notices.items[0]?.source ??
        (dashboard.notices.status === "success" ? "신규 공지 없음" : "외교부 공지 연결 대기"),
      status: dashboard.notices.status,
      statusLabel: statusBadgeLabels[dashboard.notices.status],
      value:
        dashboard.notices.status === "success"
          ? (dashboard.notices.items[0]?.title ?? "신규 0건")
          : statusLabels[dashboard.notices.status],
    },
  ];

  if (!dashboard.aiRecommendation.dismissed) {
    cards.push({
      href: "/chat",
      id: "ai",
      label: "AI 추천",
      meta: dashboard.aiRecommendation.actionUrl ? "자세히 보기" : "Gemini 연결 대기",
      status: dashboard.aiRecommendation.status,
      statusLabel: statusBadgeLabels[dashboard.aiRecommendation.status],
      value:
        dashboard.aiRecommendation.message ??
        (stayCountry ? "체류 정보를 기준으로 상담 가능" : "체류국 정보를 먼저 확인"),
    });
  }

  return {
    cards,
    subtitle: subtitleParts.join(" · "),
    title: userProfile?.name ? `안녕하세요, ${userProfile.name}님` : "오늘의 체류 상태",
  };
};
