import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Sparkles, Navigation } from "lucide-react";
import type { BudgetStrategy } from "@/lib/itinerary/budget-plan";
import {
  type TravelMode,
  TRAVEL_MODE_OPTIONS,
  TRAVEL_MODE_RADIUS_POLICY,
} from "@/lib/itinerary/recommendation-policy";
import { cn } from "@/lib/utils";

export interface QuickSettingsValues {
  durationMinutes: number;
  startTime: string;
  budget: string;
  budgetStrategy: BudgetStrategy;
  travelModes: TravelMode[];
}

interface QuickSettingsProps {
  values: QuickSettingsValues;
  onChange: (values: QuickSettingsValues) => void;
}

export function QuickSettings({ values, onChange }: QuickSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-surface-alt transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>상세 일정 설정 (선택사항)</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 border-t border-border/50 space-y-6 animate-in slide-in-from-top-2 duration-200">
          
          {/* 1. 일정 기간 & 시작 시간 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" /> 일정 범위
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "반나절 (4시간)", value: 240 },
                { label: "하루 종일 (8시간)", value: 480 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...values, durationMinutes: opt.value })}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border transition-colors",
                    values.durationMinutes === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-surface-alt"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">시작 시간:</span>
              <input
                type="time"
                value={values.startTime}
                onChange={(e) => onChange({ ...values, startTime: e.target.value })}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* 2. 이동수단 설정 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5" /> 주 이동수단 (복수 선택 가능)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TRAVEL_MODE_OPTIONS.map((mode) => {
                const isSelected = values.travelModes.includes(mode);
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      let nextModes = [...values.travelModes];
                      if (isSelected) {
                        nextModes = nextModes.filter((m) => m !== mode);
                        if (nextModes.length === 0) {
                          // 최소 1개는 선택되어야 하므로 클릭 무시
                          return;
                        }
                      } else {
                        nextModes.push(mode);
                      }
                      onChange({ ...values, travelModes: nextModes });
                    }}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium border transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-surface-alt"
                    )}
                  >
                    {TRAVEL_MODE_RADIUS_POLICY[mode].label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              선택한 이동수단에 맞춰 검색 반경과 소요 시간이 자동 조정됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
