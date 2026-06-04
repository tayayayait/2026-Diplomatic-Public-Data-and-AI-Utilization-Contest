import { Link } from "@tanstack/react-router";
import { IdCard } from "lucide-react";
import type { DashboardCardViewModel } from "@/lib/diplolife/dashboard";

export function VisaDdayCard({ card }: { card: DashboardCardViewModel }) {
  // Extract number from "D-247"
  const dDayMatch = card.value.match(/D[-+](\d+)/);
  const remaining = dDayMatch ? parseInt(dDayMatch[1], 10) : 100;
  const isUrgent = remaining <= 30;

  return (
    <Link
      to={card.href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
          <IdCard className="h-5 w-5 text-primary" />
          {card.label}
        </h2>
      </div>
      
      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-[32px] font-bold tracking-tight text-foreground">
            {card.value}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{card.meta}</p>
        </div>
        
        {/* Circular Progress (Simplified representation) */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-surface-alt">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              className="fill-none stroke-current"
              strokeWidth="10%"
              strokeDasharray="100"
              strokeDashoffset={Math.max(0, 100 - (remaining / 365) * 100)}
              style={{ stroke: isUrgent ? "var(--danger)" : "var(--primary)" }}
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
