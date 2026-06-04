import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Info, Lightbulb, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiploLifeStore } from "@/lib/diplolife/state";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const calculateStayDays = (start?: string | null, end?: string | null) => {
  const startDate = start ? new Date(start) : new Date();
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const diff = endDate.getTime() - startDate.getTime();

  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export function DailyBudgetCard() {
  const setTotalBudgetKrw = useDiploLifeStore((state) => state.setTotalBudgetKrw);
  const fetchCostEstimationData = useDiploLifeStore((state) => state.fetchCostEstimationData);
  const costInsight = useDiploLifeStore((state) => state.costInsight);
  const userProfile = useDiploLifeStore((state) => state.userProfile);
  const exchangeRate = useDiploLifeStore((state) => state.dashboard.exchangeRate);
  const [localBudget, setLocalBudget] = useState(costInsight.totalBudgetKrw);

  useEffect(() => {
    setLocalBudget(costInsight.totalBudgetKrw);
  }, [costInsight.totalBudgetKrw]);

  const stayDays = calculateStayDays(userProfile?.stayStartDate, userProfile?.stayEndDate);
  const dailyBudgetKrw = Math.round((localBudget || 0) / stayDays);
  const analysis = costInsight.analysis;
  const currency = exchangeRate.fromCurrency || costInsight.localCurrency || "USD";

  const chartData = useMemo(() => {
    if (!analysis) return [];

    return [
      { name: "식비", value: Number(analysis.dailyBudget.food) || 0 },
      { name: "숙박비", value: Number(analysis.dailyBudget.accommodation) || 0 },
      { name: "교통비", value: Number(analysis.dailyBudget.transport) || 0 },
      { name: "활동비", value: Number(analysis.dailyBudget.activity) || 0 },
    ]
      .filter((item) => item.value > 0)
      .map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }));
  }, [analysis]);

  const handleApply = () => {
    setTotalBudgetKrw(localBudget);
    void fetchCostEstimationData(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
          일일 예산 분배기
        </CardTitle>
        <CardDescription>
          <div className="font-semibold text-primary">
            총 예산: {(localBudget || 0).toLocaleString("ko-KR")} KRW
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {userProfile?.stayStartDate || "시작일"} - {userProfile?.stayEndDate || "종료일"} ({stayDays}일)
            </span>
            <span>|</span>
            <span>
              일일 평균: <strong>{dailyBudgetKrw.toLocaleString("ko-KR")} KRW</strong>
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-border bg-surface-alt p-4">
          <label className="mb-2 block text-xs font-semibold text-muted-foreground" htmlFor="daily-budget-input">
            총 예산 (KRW)
          </label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Input
                id="daily-budget-input"
                type="number"
                min={0}
                step={10000}
                value={localBudget || ""}
                onChange={(event) => setLocalBudget(Number(event.target.value))}
                className="pr-12 text-right font-mono text-lg font-bold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KRW</span>
            </div>
            <Button type="button" onClick={handleApply} disabled={costInsight.status === "loading"}>
              {costInsight.status === "loading" ? "분석 중..." : "예산 적용"}
            </Button>
          </div>
        </div>

        {costInsight.status === "loading" && !analysis ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={58} outerRadius={82}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString("ko-KR")} ${currency}`, "예산"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-surface-alt p-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <strong>
                    {item.value.toLocaleString("ko-KR")} {currency}
                  </strong>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-surface-alt p-3 text-sm">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="leading-6 whitespace-pre-wrap">{analysis.budgetComment}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-surface-alt p-4 text-center text-sm text-muted-foreground">
            비용 분석을 실행하면 일일 예산 내역을 볼 수 있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
