import { Link } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { DashboardCardViewModel } from "@/lib/diplolife/dashboard";
import { cn } from "@/lib/utils";

export function SafetyScoreCard({ card }: { card: DashboardCardViewModel }) {
  // Extract level from value "85/100 쨌 1?④퀎"
  const isHighRisk = card.value.includes("3?④퀎") || card.value.includes("4?④퀎");
  const Icon = isHighRisk ? ShieldAlert : ShieldCheck;
  
  return (
    <Link
      to={card.href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised xl:col-span-2 xl:row-span-2"
    >
      {/* Double Bezel - Left Color Bar */}
      <div className={cn(
        "absolute left-0 top-0 h-full w-[6px]",
        isHighRisk ? "bg-danger" : "bg-success"
      )} />
      
      <div className="flex items-center justify-between pl-2">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", isHighRisk ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-foreground">{card.label}</h2>
            <p className="text-[13px] font-medium text-muted-foreground">{card.statusLabel}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pl-2">
        <div className="text-[48px] font-bold tracking-tight text-foreground">{card.value.split(" 쨌 ")[0]}</div>
        <div className="mt-1 text-[18px] font-semibold text-muted-foreground">{card.value.split(" 쨌 ")[1] || card.value}</div>
        
        <div className="mt-8 rounded-xl bg-surface-alt p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">理쒓렐 ?뺣낫</p>
          <p className="mt-1 text-[15px] font-medium text-foreground line-clamp-2">{card.meta}</p>
        </div>
      </div>
    </Link>
  );
}
