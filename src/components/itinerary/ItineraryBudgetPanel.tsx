import { RefreshCw, WalletCards } from "lucide-react";

import { type BudgetStrategy, type ItineraryBudgetPlan } from "@/lib/itinerary/budget-plan";
import { cn } from "@/lib/utils";

interface ItineraryBudgetPanelProps {
  budgetPlan?: ItineraryBudgetPlan;
  budgetValueKrw: number;
  isRefreshing?: boolean;
  onBudgetChange: (budget: number) => void;
  onBudgetRefresh: () => void;
  onStrategyChange: (strategy: BudgetStrategy) => void;
}

const formatKrw = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value).toLocaleString("ko-KR")} KRW`
    : "Not set";


export function ItineraryBudgetPanel({
  budgetPlan,
  budgetValueKrw,
  isRefreshing = false,
  onBudgetChange,
  onBudgetRefresh,
  onStrategyChange,
}: ItineraryBudgetPanelProps) {


  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-bold text-foreground">예산 참고 일정</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              입력한 예산은 일일 가용 예산 참고값으로만 사용하고, 유명도와 방문 가치를 우선해 추천합니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBudgetRefresh}
          disabled={isRefreshing}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900 dark:bg-slate-900 dark:text-amber-200"
          aria-label="예산 분석 새로고침"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="itinerary-budget-krw">
          총 여행 예산(KRW)
        </label>
        <input
          id="itinerary-budget-krw"
          type="number"
          min={0}
          step={10000}
          value={budgetValueKrw === 0 ? "" : budgetValueKrw}
          onChange={(event) => onBudgetChange(Number(event.target.value))}
          className="h-11 w-full rounded-lg border border-amber-200 bg-white px-3 text-right text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-900 dark:bg-slate-900"
        />



        <div className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">일일 가용 예산</span>
            <span className="font-semibold">{formatKrw(budgetPlan?.dailyBudgetKrw)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
