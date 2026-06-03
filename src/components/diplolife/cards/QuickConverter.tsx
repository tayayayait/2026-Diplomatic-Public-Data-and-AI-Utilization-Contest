import { useMemo, useState } from "react";
import { ArrowRightLeft, Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDiploLifeStore } from "@/lib/diplolife/state";

const quickAmounts = [10, 50, 100, 500, 1000];

export function QuickConverter() {
  const exchangeRate = useDiploLifeStore((state) => state.dashboard.exchangeRate);
  const [amount, setAmount] = useState("100");
  const [tipPercent, setTipPercent] = useState(0);

  const numericAmount = Number(amount);
  const converted = useMemo(() => {
    if (!exchangeRate.rate || !Number.isFinite(numericAmount)) return null;
    return Math.round(numericAmount * (1 + tipPercent / 100) * exchangeRate.rate);
  }, [amount, exchangeRate.rate, numericAmount, tipPercent]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
          Quick converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              {exchangeRate.fromCurrency} amount
            </span>
            <Input
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              value={amount}
              className="text-right font-mono text-base"
            />
          </label>
          <ArrowRightLeft className="hidden h-5 w-5 text-muted-foreground sm:block" aria-hidden="true" />
          <div className="rounded-lg bg-surface-alt p-3 text-right">
            <p className="text-xs font-semibold text-muted-foreground">KRW estimate</p>
            <p className="font-mono text-lg font-bold text-foreground">
              {converted === null ? "-" : converted.toLocaleString("ko-KR")}
            </p>
          </div>
        </div>

        {exchangeRate.fromCurrency === "USD" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Tip</span>
            {[0, 15, 18, 20].map((percent) => (
              <Button
                key={percent}
                type="button"
                variant={tipPercent === percent ? "default" : "outline"}
                size="sm"
                onClick={() => setTipPercent(percent)}
              >
                {percent === 0 ? "None" : `${percent}%`}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {quickAmounts.map((value) => (
            <Button key={value} type="button" variant="secondary" size="sm" onClick={() => setAmount(String(value))}>
              {value.toLocaleString("ko-KR")} {exchangeRate.fromCurrency}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
