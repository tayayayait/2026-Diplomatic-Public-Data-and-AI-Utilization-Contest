import { ArrowRight, CalendarDays, WalletCards } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface BudgetItineraryCtaProps {
  destinationLabel?: string | null;
  totalBudgetKrw?: number | null;
}

const formatBudget = (budget?: number | null) => {
  if (!budget || !Number.isFinite(budget) || budget <= 0) return null;

  return `${Math.round(budget).toLocaleString("ko-KR")} KRW`;
};

const createItineraryHref = (budget?: number | null) => {
  if (!budget || !Number.isFinite(budget) || budget <= 0) return "/itinerary";

  return `/itinerary?budgetKrw=${Math.round(budget)}`;
};

export function BudgetItineraryCta({
  destinationLabel = "선택한 여행지",
  totalBudgetKrw,
}: BudgetItineraryCtaProps) {
  const budgetLabel = formatBudget(totalBudgetKrw);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">AI 맞춤 일정 생성</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {destinationLabel} 생활비를 확인하셨나요? 전용 AI 일정 화면에서 출발지, 취향, 동선을 설정합니다.
            </p>
            {budgetLabel && (
              <p className="mt-1 text-xs font-semibold text-primary">현재 예산: {budgetLabel}</p>
            )}
          </div>
        </div>

        <a
          href={createItineraryHref(totalBudgetKrw)}
          className={buttonVariants({ className: "shrink-0", size: "lg" })}
        >
          <CalendarDays className="h-5 w-5" />
          AI 일정에서 예산 반영 코스 만들기          <ArrowRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}
