import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import type { DashboardCardViewModel } from "@/lib/diplolife/dashboard";

export function AiRecommendationCard({ card }: { card: DashboardCardViewModel }) {
  return (
    <div className="relative rounded-[20px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 p-[1px] shadow-card md:col-span-2 xl:col-span-4 transition-all hover:shadow-raised hover:-translate-y-0.5">
      <div className="relative flex h-full flex-col justify-between rounded-[20px] bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-[#8B5CF6]" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{card.label}</span>
          </h2>
          <button type="button" className="rounded-full p-1 text-muted-foreground hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="mt-4 text-[16px] font-semibold leading-relaxed text-foreground">
          {card.value}
        </p>
        
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">Gemini 3.0 Flash Preview</p>
          <Link
            to={card.href}
            className="inline-flex items-center rounded-full bg-[#8B5CF6]/10 px-4 py-1.5 text-[13px] font-bold text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/20"
          >
            {card.meta}
          </Link>
        </div>
      </div>
    </div>
  );
}
