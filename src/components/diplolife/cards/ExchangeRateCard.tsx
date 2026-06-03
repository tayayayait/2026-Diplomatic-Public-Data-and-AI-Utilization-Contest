import { Link } from "@tanstack/react-router";
import { CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import type { DashboardCardViewModel } from "@/lib/diplolife/dashboard";

export function ExchangeRateCard({ card }: { card: DashboardCardViewModel }) {
  const isUp = card.meta.includes("↑") || card.meta.includes("+");
  const isDown = card.meta.includes("↓") || card.meta.includes("-");
  
  return (
    <Link
      to={card.href}
      className="group relative flex flex-col justify-between rounded-[20px] border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
          <CreditCard className="h-5 w-5 text-primary" />
          {card.label}
        </h2>
      </div>
      
      <div className="mt-6">
        <p className="text-[24px] font-bold tracking-tight text-foreground">{card.value}</p>
        <div className="mt-2 flex items-center gap-2">
          {isUp && <span className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[12px] font-semibold text-danger"><TrendingUp className="h-3 w-3" /> {card.meta}</span>}
          {isDown && <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[12px] font-semibold text-success"><TrendingDown className="h-3 w-3" /> {card.meta}</span>}
          {!isUp && !isDown && <span className="text-[13px] text-muted-foreground">{card.meta}</span>}
        </div>
      </div>
    </Link>
  );
}
