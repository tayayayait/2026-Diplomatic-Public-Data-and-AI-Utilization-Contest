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
  `${new Intl.NumberFormat("ko-KR", {`
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)} ${currency}``;

const formatRateValue = (value: number, currency: string) =>
  `${new Intl.NumberFormat("ko-KR", {`
    maximumFractionDigits: value >= 100 ? 2 : 6,
    minimumFractionDigits: value < 0.01 ? 6 : 0,
  }).format(value)} ${currency}``;

const formatDifference = (value: number, currency: string) => {
  if (value === 0) return "-";
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${formatAmount(value, currency)}`;
};

const judgmentClassNames: Record<ExchangeSimulationRow["judgment"], string> = {
  湲곗?: "bg-muted text-muted-foreground",
  ?숈씪: "bg-muted text-muted-foreground",
  "?뚰룺 ?좊━": "bg-success/10 text-success",
  ?좊━: "bg-success/15 text-success",
  "?뚰룺 ?먰빐": "bg-warning/10 text-warning",
  ?먰빐: "bg-danger/10 text-danger",
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
    bestRow && bestRow.label !== "?ㅻ뒛"
      ? `?덉륫 湲곗??쇰줈??${bestRow.date}???섏쟾??寃쎌슦 ?ㅻ뒛蹂대떎 ??${formatAmount(`
          bestRow.differenceFromToday,
          targetCurrency,
        )}瑜???諛쏆쓣 媛?μ꽦???덉뒿?덈떎.``
      : "?덉륫 踰붿쐞?먯꽌???ㅻ뒛 ?섏쟾??媛???좊━?⑸땲??";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="min-h-11 gap-2" disabled={!data}>
          <Calculator className="h-4 w-4" />
          ?섏쟾 ?쒕??덉씠??蹂닿린
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
          <DialogTitle className="text-xl">Text</DialogTitle>
          <DialogDescription>
            ?낅젰 湲덉븸 湲곗??쇰줈 ?ㅻ뒛, 1???? 3???? 7?????덉긽 ?섎졊?≪쓣 鍮꾧탳?⑸땲??
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
              ?섏쟾 ?덉젙 湲덉븸
              <Input
                inputMode="decimal"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                className="h-11 text-right font-mono"
              />
            </label>
            <div className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-bold text-foreground">
              <span>{baseCurrency}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span>{targetCurrency}</span>
            </div>
            <Button type="submit" className="h-11" disabled={parsedAmount === null}>
              怨꾩궛?섍린
            </Button>
          </form>

          {parsedAmount === null && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              ?섏쟾 ?덉젙 湲덉븸? 0蹂대떎 ???レ옄?ъ빞 ?⑸땲??
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-surface-alt text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Text</th>
                    <th className="px-4 py-3 text-right">?덉긽 ?섏쑉</th>
                    <th className="px-4 py-3 text-right">?덉긽 ?섎졊 湲덉븸</th>
                    <th className="px-4 py-3 text-right">?ㅻ뒛 ?섏쟾 ?鍮?李⑥씠</th>
                    <th className="px-4 py-3 text-center">?먮떒</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.label}
                      className={`border-t border-border ${`
                        row.isBest ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "bg-background"
                      }`}`
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{row.label}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{row.date}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatRateValue(row.rate, targetCurrency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                        {formatAmount(row.targetAmount, targetCurrency)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold ${`
                          row.differenceFromToday > 0
                            ? "text-success"
                            : row.differenceFromToday < 0
                              ? "text-danger"
                              : "text-muted-foreground"
                        }`}`
                      >
                        {formatDifference(row.differenceFromToday, targetCurrency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${judgmentClassNames[row.judgment]}`}
                        >
                          {row.judgment}
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
              ?ㅻ쭔 ?섏쑉 ?덉륫? ?ㅼ젣 ?쒖옣 ?곹솴???곕씪 ?щ씪吏????덉쑝誘濡?李멸퀬?⑹쑝濡쒕쭔 ?쒖슜?댁＜?몄슂.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
