import { useMemo } from "react";
import type { BudgetFitLevel } from "@/lib/diplolife/state";

interface BudgetFitGaugeProps {
  budget: number;
  averageCost: number;
  fitLevel: BudgetFitLevel;
  fitLabel: string;
}

const LEVEL_COLORS: Record<BudgetFitLevel, string> = {
  insufficient: "bg-red-500",
  tight: "bg-amber-500",
  moderate: "bg-green-500",
  comfortable: "bg-blue-500"
};

export function BudgetFitGauge({ budget, averageCost, fitLevel, fitLabel }: BudgetFitGaugeProps) {
  const { ratio, barColor } = useMemo(() => {
    // ?됯퇏 ?앺솢鍮?averageCost)瑜?100%濡?蹂댁븯???뚯쓽 ?덉궛 鍮꾩쑉
    // 理쒕? 150% 源뚯?留?寃뚯씠吏???쒖떆 (UI媛 ?リ퀬 ?섍???寃?諛⑹?)
    const calcRatio = Math.min((budget / averageCost) * 100, 150);
    return {
      ratio: calcRatio,
      barColor: LEVEL_COLORS[fitLevel] || "bg-primary"
    };
  }, [budget, averageCost, fitLevel]);

  return (
    <div className="mt-6 w-full space-y-2">
      <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
        <span>Text</span>
        <span className="font-bold text-foreground">{fitLabel}</span>
        <span>?ъ쑀</span>
      </div>
      
      {/* 寃뚯씠吏 諛?而⑦뀒?대꼫 */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-alt">
        {/* ?됯퇏 ?앺솢鍮?100%) 湲곗???*/}
        <div 
          className="absolute bottom-0 top-0 z-10 w-[2px] bg-foreground/20" 
          style={{ left: "66.66%" }} /* 100/150 = 66.6% ?꾩튂媛 1諛곗닔 湲곗???*/
          title="Title"
        />
        
        {/* ?꾩옱 ?덉궛 梨꾩썙吏?諛?*/}
        <div 
          className={`absolute bottom-0 left-0 top-0 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${(ratio / 150) * 100}%` }}
        />
      </div>
      
      <div className="flex justify-between text-[12px] text-muted-foreground">
        <span>Text</span>
        <span className="translate-x-[50%]">?됯퇏 ({averageCost.toLocaleString()}??</span>
        <span>{Math.round(averageCost * 1.5).toLocaleString()}??</span>
      </div>
    </div>
  );
}
