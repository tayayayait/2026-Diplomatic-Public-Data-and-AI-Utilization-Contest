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
  destinationLabel = "?좏깮???ы뻾吏",
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
            <h2 className="text-base font-bold text-foreground">Text</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {destinationLabel} ?앺솢鍮꾨? ?뺤씤?????꾩슜 AI ?쇱젙 ?붾㈃?먯꽌 異쒕컻吏, 痍⑦뼢, ?숈꽑???ㅼ젙?⑸땲??
            </p>
            {budgetLabel && (
              <p className="mt-1 text-xs font-semibold text-primary">?꾩옱 ?덉궛 {budgetLabel}</p>
            )}
          </div>
        </div>

        <a
          href={createItineraryHref(totalBudgetKrw)}
          className={buttonVariants({ className: "shrink-0", size: "lg" })}
        >
          <CalendarDays className="h-5 w-5" />
          AI ?쇱젙?먯꽌 ?덉궛 諛섏쁺 肄붿뒪 留뚮뱾湲?          <ArrowRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}
