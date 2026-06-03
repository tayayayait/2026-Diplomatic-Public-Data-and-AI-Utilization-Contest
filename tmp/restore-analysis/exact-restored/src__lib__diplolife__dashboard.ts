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
  AU: "?몄＜",
  CA: "罹먮굹??,
  DE: "?낆씪",
  GB: "?곴뎅",
  JP: "?쇰낯",
  US: "誘멸뎅",
};

const purposeLabels: Record<UserProfile["stayPurpose"], string> = {
  RESIDENCE: "嫄곗＜",
  STUDY: "?좏븰",
  TRAVEL: "?ы뻾",
  VOLUNTEER: "遊됱궗",
  WORK: "洹쇰Т",
};

const statusLabels: Record<LoadingStatus, string> = {
  error: "?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??,
  idle: "?뺤떎???뺣낫 ?놁쓬",
  loading: "遺덈윭?ㅻ뒗 以?,
  success: "",
};

const statusBadgeLabels: Record<LoadingStatus | "empty", string> = {
  empty: "?놁쓬",
  error: "?ㅻ쪟",
  idle: "?뺤떎???뺣낫 ?놁쓬",
  loading: "遺덈윭?ㅻ뒗 以?,
  success: "?뺤긽",
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
  if (daysRemaining === null) return "?뺤떎???뺣낫 ?놁쓬";
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
      message: "鍮꾩옄 醫낅즺?쇱씠 吏?ъ뒿?덈떎. 利됱떆 泥대쪟 ?먭꺽???뺤씤?섏꽭??",
      status: "success",
    };
  }

  if (daysRemaining !== null && daysRemaining <= 90) {
    return {
      actionUrl: "/visa",
      dismissed: false,
      message: `鍮꾩옄 留뚮즺 ${daysRemaining}???꾩엯?덈떎. 媛깆떊 ?쒕쪟? ?덉빟 ?쇱젙???뺤씤?섏꽭??`,
      status: "success",
    };
  }

  return {
    actionUrl: "/chat",
    dismissed: false,
    message: `${countryLabel(profile.country)} ${purposeLabels[profile.stayPurpose]} 泥대쪟 ?뺣낫瑜?湲곗??쇰줈 ?덉쟾, 鍮꾩옄, ?앺솢鍮??뚮┝??以鍮꾪뻽?듬땲??`,
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
      label: "?덉쟾吏??,
      meta:
        dashboard.safetyScore.incidents[0]?.title ??
        (dashboard.safetyScore.status === "success" ? "理쒓렐 ?ш굔?ш퀬 ?놁쓬" : "?멸탳遺 ?곗씠???곌껐 ?湲?),
      status: dashboard.safetyScore.status,
      statusLabel: statusBadgeLabels[dashboard.safetyScore.status],
      value:
        dashboard.safetyScore.status === "success"
          ? `${dashboard.safetyScore.value}/100 쨌 ${dashboard.safetyScore.level}?④퀎`
          : statusLabels[dashboard.safetyScore.status],
    },
    {
      href: "/visa",
      id: "visa",
      label: "鍮꾩옄 D-day",
      meta: dashboard.visaDday.expiryDate
        ? `${dashboard.visaDday.expiryDate} 留뚮즺`
        : "泥대쪟 醫낅즺??誘몃벑濡?,
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
      label: "?섏쑉",
      meta:
        dashboard.exchangeRate.changePercent === null
          ? "蹂?숇쪧 ?놁쓬"
          : `?꾩씪 ?鍮?${dashboard.exchangeRate.changePercent}%`,
      status: dashboard.exchangeRate.status,
      statusLabel: statusBadgeLabels[dashboard.exchangeRate.status],
      value:
        dashboard.exchangeRate.status === "success" && dashboard.exchangeRate.rate !== null
          ? `1 ${dashboard.exchangeRate.fromCurrency} = ??{formatKrw(dashboard.exchangeRate.rate)}`
          : statusLabels[dashboard.exchangeRate.status],
    },
    {
      href: "/weather",
      id: "weather",
      label: "?좎뵪",
      meta: weatherAlerts[0]?.source ?? "湲곗긽 ?밸낫 ?놁쓬",
      status: weatherAlerts[0]?.status ?? "empty",
      statusLabel: statusBadgeLabels[weatherAlerts[0]?.status ?? "empty"],
      value: weatherAlerts[0]?.title ?? "?밸낫 ?놁쓬",
    },
    {
      href: "/notices",
      id: "notices",
      label: "怨듭?",
      meta:
        dashboard.notices.items[0]?.source ??
        (dashboard.notices.status === "success" ? "?좉퇋 怨듭? ?놁쓬" : "?멸탳遺 怨듭? ?곌껐 ?湲?),
      status: dashboard.notices.status,
      statusLabel: statusBadgeLabels[dashboard.notices.status],
      value:
        dashboard.notices.status === "success"
          ? (dashboard.notices.items[0]?.title ?? "?좉퇋 0嫄?)
          : statusLabels[dashboard.notices.status],
    },
  ];

  if (!dashboard.aiRecommendation.dismissed) {
    cards.push({
      href: "/chat",
      id: "ai",
      label: "AI 異붿쿇",
      meta: dashboard.aiRecommendation.actionUrl ? "?먯꽭??蹂닿린" : "Gemini ?곌껐 ?湲?,
      status: dashboard.aiRecommendation.status,
      statusLabel: statusBadgeLabels[dashboard.aiRecommendation.status],
      value:
        dashboard.aiRecommendation.message ??
        (stayCountry ? "泥대쪟 ?뺣낫瑜?湲곗??쇰줈 ?곷떞 媛?? : "泥대쪟援??뺣낫瑜?癒쇱? ?뺤씤"),
    });
  }

  return {
    cards,
    subtitle: subtitleParts.join(" 쨌 "),
    title: userProfile?.name ? `?덈뀞?섏꽭?? ${userProfile.name}?? : "?ㅻ뒛??泥대쪟 ?곹깭",
  };
};
