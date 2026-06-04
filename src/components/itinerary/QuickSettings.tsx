import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Gauge, Sparkles, Map } from "lucide-react";
import type { BudgetStrategy } from "@/lib/itinerary/budget-plan";
import {
  type ItineraryIntensity,
  type TravelMode,
  getSoftDurationMinutesForIntensity,
  ITINERARY_INTENSITY_OPTIONS,
  TRAVEL_MODE_OPTIONS,
} from "@/lib/itinerary/recommendation-policy";
import { cn } from "@/lib/utils";

const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  WALK: "도보",
  TRANSIT: "대중교통",
  DRIVE: "자동차",
  BICYCLE: "자전거",
};


export interface QuickSettingsValues {
  durationMinutes?: number;
  startTime: string;
  budget: string;
  budgetStrategy: BudgetStrategy;
  itineraryIntensity: ItineraryIntensity;
  travelModes: TravelMode[];
}

interface QuickSettingsProps {
  values: QuickSettingsValues;
  onChange: (values: QuickSettingsValues) => void;
  defaultOpen?: boolean;
}

export function QuickSettings({ values, onChange, defaultOpen = false }: QuickSettingsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between p-4 text-sm font-medium transition-colors hover:bg-surface-alt"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>상세 일정 설정</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-border/50 p-4">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              시작 시간
            </label>
            <input
              type="time"
              value={values.startTime}
              onChange={(event) => onChange({ ...values, startTime: event.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              일정 강도
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {ITINERARY_INTENSITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...values,
                      durationMinutes: getSoftDurationMinutesForIntensity(option.value),
                      itineraryIntensity: option.value,
                    })
                  }
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                    values.itineraryIntensity === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-surface-alt",
                  )}
                >
                  <span className="block font-bold">{option.label}</span>
                  <span className="mt-0.5 block opacity-80">{option.targetPlaceCount}곳</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Map className="h-3.5 w-3.5" aria-hidden="true" />
              선호 이동 수단
            </label>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
              {TRAVEL_MODE_OPTIONS.map((mode) => {
                const currentModes = values.travelModes ?? ["WALK", "TRANSIT"];
                const isSelected = currentModes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        // 최소 1개는 무조건 유지되도록 방어 로직 적용
                        if (currentModes.length <= 1) return;
                        onChange({ ...values, travelModes: currentModes.filter((m) => m !== mode) });
                      } else {
                        onChange({ ...values, travelModes: [...currentModes, mode] });
                      }
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-surface-alt",
                    )}
                  >
                    {TRAVEL_MODE_LABELS[mode]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
