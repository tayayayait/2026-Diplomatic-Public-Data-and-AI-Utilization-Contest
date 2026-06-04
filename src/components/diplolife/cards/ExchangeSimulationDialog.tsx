import { useMemo, useState } from "react";
import { ArrowRight, Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buildExchangeSimulationRows,
  type ExchangeRateForecastResult,
  type ExchangeSimulationRow,
} from "@/lib/diplolife/api/exchange-rate";

interface ExchangeSimulationDialogProps {
  baseCurrency: string;
  data: ExchangeRateForecastResult | undefined;
  initialAmount: number | null;
  targetCurrency: string;
}

const parseAmount = (value: string) => {
  const amount = Number(value.replace(/,/g, "").trim());

  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const formatAmount = (value: number, currency: string) =>
  `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)} ${currency}`;

const formatRateValue = (value: number, currency: string) =>
  `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: value >= 100 ? 2 : 6,
    minimumFractionDigits: value < 0.01 ? 6 : 0,
  }).format(value)} ${currency}`;

const formatDifference = (value: number, currency: string) => {
  if (value === 0) return "-";
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${formatAmount(value, currency)}`;
};

const judgmentClassNames: Record<ExchangeSimulationRow["judgment"], string> = {
  Current: "bg-muted text-muted-foreground",
  "No change": "bg-muted text-muted-foreground",
  "Slight gain": "bg-success/10 text-success",
  Gain: "bg-success/15 text-success",
  "Slight loss": "bg-warning/10 text-warning",
  Loss: "bg-danger/10 text-danger",
};

const labelTranslations: Record<ExchangeSimulationRow["label"], string> = {
  Today: "오늘",
  "1 day": "1일 후",
  "3 days": "3일 후",
  "7 days": "7일 후",
};

const judgmentTranslations: Record<ExchangeSimulationRow["judgment"], string> = {
  Current: "현재",
  "No change": "변동 없음",
  "Slight gain": "소폭 이익",
  Gain: "이익",
  "Slight loss": "소폭 손실",
  Loss: "손실",
};

export function ExchangeSimulationDialog({
  baseCurrency,
  data,
  initialAmount,
  targetCurrency,
}: ExchangeSimulationDialogProps) {
  const [amountInput, setAmountInput] = useState(() => String(initialAmount ?? 1_000_000));
  const [submittedAmount, setSubmittedAmount] = useState(initialAmount ?? 1_000_000);
  const parsedAmount = parseAmount(amountInput);
  const currentPoint = data?.history.at(-1);

  const rows = useMemo(() => {
    if (!data || !currentPoint || submittedAmount <= 0) return [];

    return buildExchangeSimulationRows({
      amount: submittedAmount,
      currentDate: currentPoint.date,
      currentRate: currentPoint.rate,
      forecast: data.forecast,
    });
  }, [currentPoint, data, submittedAmount]);

  const bestRow = rows.find((row) => row.isBest);
  const summary =
    bestRow && bestRow.label !== "Today"
      ? `${labelTranslations[bestRow.label]}의 예상 금액이 가장 높습니다: ${formatAmount(bestRow.targetAmount, targetCurrency)}.`
      : "이 시뮬레이션에서는 현재 시점이 가장 유리한 옵션입니다.";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="min-h-11 gap-2" disabled={!data}>
          <Calculator className="h-4 w-4" aria-hidden="true" />
          환전 타이밍 시뮬레이션
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
          <DialogTitle className="text-xl">환전 시기 시뮬레이션</DialogTitle>
          <DialogDescription>
            현재 예측 데이터를 기반으로 오늘, 1일 후, 3일 후, 7일 후의 환율을 비교합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
          <form
            className="grid gap-3 rounded-lg border border-border bg-surface-alt p-4 md:grid-cols-[1fr_auto_auto] md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (parsedAmount !== null) setSubmittedAmount(parsedAmount);
            }}
          >
            <label className="space-y-1.5 text-sm font-medium">
              환전할 금액
              <Input
                inputMode="decimal"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                className="h-11 text-right font-mono"
              />
            </label>
            <div className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-bold text-foreground">
              <span>{baseCurrency}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{targetCurrency}</span>
            </div>
            <Button type="submit" className="h-11" disabled={parsedAmount === null}>
              업데이트
            </Button>
          </form>

          {parsedAmount === null && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              0보다 큰 금액을 입력하세요.
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-surface-alt text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">시점</th>
                    <th className="px-4 py-3 text-right">환율</th>
                    <th className="px-4 py-3 text-right">예상 금액</th>
                    <th className="px-4 py-3 text-right">차액</th>
                    <th className="px-4 py-3 text-center">평가</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.label}
                      className={`border-t border-border ${
                        row.isBest ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "bg-background"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{labelTranslations[row.label]}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{row.date}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatRateValue(row.rate, targetCurrency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                        {formatAmount(row.targetAmount, targetCurrency)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold ${
                          row.differenceFromToday > 0
                            ? "text-success"
                            : row.differenceFromToday < 0
                              ? "text-danger"
                              : "text-muted-foreground"
                        }`}
                      >
                        {formatDifference(row.differenceFromToday, targetCurrency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${judgmentClassNames[row.judgment]}`}>
                          {judgmentTranslations[row.judgment]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <p className="font-semibold">{summary}</p>
            <p className="mt-1 text-muted-foreground">
              예측치는 추정치입니다. 송금하기 전에 은행이나 환전 서비스 제공업체의 환율을 확인하세요.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
