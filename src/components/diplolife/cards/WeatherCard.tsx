import { Link } from "@tanstack/react-router";
import { CloudSun } from "lucide-react";
import type { DashboardCardViewModel } from "@/lib/diplolife/dashboard";

export function WeatherCard({ card }: { card: DashboardCardViewModel }) {
  return (
    <Link
      to={card.href}
      className="group relative flex flex-col justify-between rounded-[20px] border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
          <CloudSun className="h-5 w-5 text-primary" />
          {card.label}
        </h2>
      </div>
      
      <div className="mt-6">
        <p className="text-[24px] font-bold tracking-tight text-foreground">{card.value}</p>
        <p className="mt-2 text-[13px] text-muted-foreground">{card.meta}</p>
      </div>
    </Link>
  );
}
