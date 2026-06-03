import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import type { DashboardCardViewModel } from "@/lib/diplolife/dashboard";

export function NoticeCard({ card }: { card: DashboardCardViewModel }) {
  return (
    <Link
      to={card.href}
      className="group relative flex flex-col justify-between rounded-[20px] border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised md:col-span-2 xl:col-span-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
          <Bell className="h-5 w-5 text-primary" />
          {card.label}
        </h2>
      </div>
      
      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
          ?멸탳遺
        </span>
        <p className="text-[16px] font-semibold text-foreground truncate">{card.value}</p>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">{card.meta}</p>
    </Link>
  );
}
