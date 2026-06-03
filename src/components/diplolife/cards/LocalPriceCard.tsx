import { Home, ShoppingBasket, TrainFront } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import type { CountryCostOfLiving } from "@/lib/diplolife/api/wherenext";

type CostBreakdownKey = "rent" | "groceries" | "transport";

export interface CountryCostFallbackRow {
  key: CostBreakdownKey;
  krwAmount: number;
  label: string;
  localAmount: number;
  localCurrency: string;
  note: string;
  sourceUsdAmount: number;
}

const LABELS: Record<CostBreakdownKey, string> = {
  groceries: "Groceries",
  rent: "Rent",
  transport: "Transport",
};

const ICONS = {
  groceries: ShoppingBasket,
  rent: Home,
  transport: TrainFront,
} satisfies Record<CostBreakdownKey, typeof Home>;

const ORDER: CostBreakdownKey[] = ["rent", "groceries", "transport"];

const formatMoney = (amount: number, currency: string) =>
  `${amount.toLocaleString("ko-KR", {
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  })} ${currency}`;

export function createCountryCostFallbackRows(
  countryCost: Pick<CountryCostOfLiving, "data"> | null | undefined,
  rates: {
    localCurrency: string;
    localCurrencyKrwRate: number | null;
    usdToKrwRate: number | null;
  },
): CountryCostFallbackRow[] {
  const breakdown = countryCost?.data?.breakdown;
  if (!breakdown || !rates.usdToKrwRate || !rates.localCurrencyKrwRate) return [];

  return ORDER.flatMap((key) => {
    const item = breakdown[key];
    if (!item || !Number.isFinite(item.usd)) return [];

    const krwAmount = Math.round(item.usd * rates.usdToKrwRate);
    const localAmount =
      rates.localCurrency === "USD"
        ? item.usd
        : Math.round(krwAmount / rates.localCurrencyKrwRate);

    return [
      {
        key,
        krwAmount,
        label: LABELS[key],
        localAmount,
        localCurrency: rates.localCurrency,
        note: item.note,
        sourceUsdAmount: item.usd,
      },
    ];
  });
}

export function LocalPriceCard() {
  const costInsight = useDiploLifeStore((state) => state.costInsight);
  const rows = createCountryCostFallbackRows(costInsight.countryCost, {
    localCurrency: costInsight.localCurrency || "USD",
    localCurrencyKrwRate: costInsight.usdToKrwRate,
    usdToKrwRate: costInsight.usdToKrwRate,
  });

  const cityItems = costInsight.cityPrices?.data?.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingBasket className="h-5 w-5 text-primary" aria-hidden="true" />
          Local price snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cityItems.length > 0 && (
          <div className="space-y-2">
            {cityItems.map((item) => (
              <div
                key={`${item.category}-${item.item}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-alt p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{item.item}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {formatMoney(item.price_local, costInsight.localCurrency || "LOCAL")}
                  </p>
                  <p className="text-xs text-muted-foreground">${item.price_usd.toLocaleString("ko-KR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {rows.map((row) => {
              const Icon = ICONS[row.key];
              return (
                <article key={row.key} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    {row.label}
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(row.localAmount, row.localCurrency)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.krwAmount.toLocaleString("ko-KR")} KRW
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-surface-alt p-4 text-sm text-muted-foreground">
            Local price data is not available yet. Run the cost analysis after selecting a country and city.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
