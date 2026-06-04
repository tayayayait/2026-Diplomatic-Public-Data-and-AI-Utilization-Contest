import { BadgeCheck, MapPinned, Route, SlidersHorizontal } from "lucide-react";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import type { ItineraryBudgetPlan } from "@/lib/itinerary/budget-plan";
import { createRecommendationCriteriaViewModel } from "@/lib/itinerary/recommendation-explanation";

interface RecommendationCriteriaPanelProps {
  budgetPlan?: ItineraryBudgetPlan;
  places?: ItineraryPlace[];
}

export function RecommendationCriteriaPanel({ budgetPlan, places = [] }: RecommendationCriteriaPanelProps) {
  const model = createRecommendationCriteriaViewModel(places, budgetPlan);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold leading-5 text-foreground">추천 기준</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{model.dataBasisLabel}</p>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold leading-4 text-primary">
          {model.sourceLabel}
        </span>
      </div>

      <div className="grid gap-2 text-xs leading-5 text-foreground sm:grid-cols-2">
        <div className="flex gap-2 rounded-lg bg-background px-3 py-2 sm:col-span-2">
          <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{model.sortLabel}</span>
        </div>
        <div className="flex gap-2 rounded-lg bg-background px-3 py-2 sm:col-span-2">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{model.exclusionLabel}</span>
        </div>
        <div className="flex gap-2 rounded-lg bg-background px-3 py-2 sm:col-span-2">
          <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{model.budgetLabel}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <SlidersHorizontal className="mt-0.5 h-4 w-4 text-muted-foreground" />
        {model.signalLabels.map((signal) => (
          <span
            key={signal}
            className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium leading-5 text-muted-foreground"
          >
            {signal}
          </span>
        ))}
      </div>
    </section>
  );
}
