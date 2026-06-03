import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

import type { DashboardState } from "@/lib/diplolife/state";

interface ExchangeAlertBannerProps {
  exchangeRate: DashboardState["exchangeRate"];
}

export function ExchangeAlertBanner({ exchangeRate }: ExchangeAlertBannerProps) {
  const change = exchangeRate.changePercent;
  if (change === null || change === 0 || Math.abs(change) < 1) return null;

  const isUp = change > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const tone = isUp
    ? "border-danger/20 bg-danger/10 text-danger"
    : "border-primary/20 bg-primary/10 text-primary";

  return (
    <section className={`mb-6 rounded-lg border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-bold">
            {isUp ? "Exchange rate is rising" : "Exchange rate is falling"}
          </h2>
          <p className="mt-1 text-sm leading-6">
            {exchangeRate.fromCurrency}/KRW moved {Math.abs(change).toFixed(2)}% from the previous reference point.
            {isUp
              ? " Recheck your living-cost budget before committing large payments."
              : " This may be a better moment to exchange part of your budget."}
          </p>
        </div>
        <AlertCircle className="hidden h-5 w-5 shrink-0 opacity-70 sm:block" aria-hidden="true" />
      </div>
    </section>
  );
}
