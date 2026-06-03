import type { CostAnalysisResult } from "@/lib/diplolife/api/gemini-cost";
import type { StayPurpose, UserProfile } from "@/lib/diplolife/state";

export type BudgetStrategy = "saving" | "balanced" | "experience";

export interface ItineraryLocalBudget {
  accommodation: number;
  activity: number;
  food: number;
  total: number;
  transport: number;
}

export interface ItineraryBudgetPlan {
  dailyBudgetKrw?: number;
  dailyLocalBudget?: ItineraryLocalBudget;
  exchangeRateKrwPerLocal?: number;
  stayDays?: number;
  strategy: BudgetStrategy;
  targetCurrency?: string;
  totalBudgetKrw?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const strategyLabels: Record<BudgetStrategy, string> = {
  balanced: "Balanced",
  experience: "Experience first",
  saving: "Saving first",
};

const travelDistribution = {
  accommodation: 0.35,
  activity: 0.2,
  food: 0.3,
  transport: 0.15,
};

function calculateStayDays(profile?: Pick<UserProfile, "stayStartDate" | "stayEndDate"> | null) {
  if (!profile) return 1;

  const start = Date.parse(`${profile.stayStartDate}T00:00:00.000Z`);
  const end = profile.stayEndDate ? Date.parse(`${profile.stayEndDate}T00:00:00.000Z`) : NaN;

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;

  return Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
}

function createFallbackLocalBudget(dailyBudgetKrw: number, exchangeRateKrwPerLocal: number) {
  const total = Math.max(0, Math.round(dailyBudgetKrw / exchangeRateKrwPerLocal));

  return {
    accommodation: Math.round(total * travelDistribution.accommodation),
    activity: Math.round(total * travelDistribution.activity),
    food: Math.round(total * travelDistribution.food),
    total,
    transport: Math.round(total * travelDistribution.transport),
  };
}

function hasCompleteDailyBudget(
  value: CostAnalysisResult["dailyBudget"] | undefined,
): value is ItineraryLocalBudget {
  return Boolean(
    value &&
      Number.isFinite(value.accommodation) &&
      Number.isFinite(value.activity) &&
      Number.isFinite(value.food) &&
      Number.isFinite(value.total) &&
      Number.isFinite(value.transport),
  );
}

export function resolveBudgetStrategy(
  budgetPlan: Pick<ItineraryBudgetPlan, "strategy"> | undefined,
  budgetLabel: string,
): BudgetStrategy {
  if (budgetPlan?.strategy) return budgetPlan.strategy;
  const normalizedBudget = budgetLabel.toLowerCase();
  if (normalizedBudget.includes("saving") || normalizedBudget.includes("budget")) return "saving";
  if (normalizedBudget.includes("experience") || normalizedBudget.includes("premium")) return "experience";

  return "balanced";
}

export function resolveEffectiveItineraryBudgetStrategy(
  budgetPlan: Pick<ItineraryBudgetPlan, "dailyBudgetKrw" | "strategy"> | undefined,
): BudgetStrategy {
  return budgetPlan?.strategy ?? "balanced";
}

export function createItineraryBudgetPlan({
  budgetStrategy,
  costAnalysis,
  exchangeRate,
  profile,
  totalBudgetKrw,
}: {
  budgetStrategy: BudgetStrategy;
  costAnalysis: Pick<CostAnalysisResult, "dailyBudget"> | null;
  exchangeRate: { fromCurrency: string; rate: number | null };
  profile:
    | Pick<UserProfile, "stayEndDate" | "stayPurpose" | "stayStartDate">
    | { stayPurpose: StayPurpose; stayEndDate: string | null; stayStartDate: string }
    | null
    | undefined;
  totalBudgetKrw: number;
}): ItineraryBudgetPlan {
  const stayDays = calculateStayDays(profile);
  const dailyBudgetKrw = Math.round(totalBudgetKrw / stayDays);
  const exchangeRateKrwPerLocal =
    typeof exchangeRate.rate === "number" && Number.isFinite(exchangeRate.rate) && exchangeRate.rate > 0
      ? exchangeRate.rate
      : 1;
  const dailyLocalBudget = hasCompleteDailyBudget(costAnalysis?.dailyBudget)
    ? costAnalysis.dailyBudget
    : createFallbackLocalBudget(dailyBudgetKrw, exchangeRateKrwPerLocal);

  return {
    dailyBudgetKrw,
    dailyLocalBudget,
    exchangeRateKrwPerLocal,
    stayDays,
    strategy: budgetStrategy,
    targetCurrency: exchangeRate.fromCurrency,
    totalBudgetKrw,
  };
}

export function formatBudgetPlanForPrompt(plan?: ItineraryBudgetPlan): string {
  if (!plan) return "No structured budget plan provided.";

  const parts = [
    plan.totalBudgetKrw !== undefined ? `total ${plan.totalBudgetKrw.toLocaleString("ko-KR")} KRW` : null,
    plan.dailyBudgetKrw !== undefined ? `daily ${plan.dailyBudgetKrw.toLocaleString("ko-KR")} KRW` : null,
    `strategy ${strategyLabels[plan.strategy]}`,
  ].filter((part): part is string => Boolean(part));

  return parts.join(", ");
}

export function getGoogleTextSearchPriceLevelsForStrategy(strategy: BudgetStrategy): string[] {
  return [];
}

export function getBudgetStrategyLabel(strategy: BudgetStrategy): string {
  return strategyLabels[strategy];
}
