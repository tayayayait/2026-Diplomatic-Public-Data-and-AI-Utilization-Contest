import { useDiploLifeStore } from "@/lib/diplolife/state";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Wallet, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

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

  const handleApply = () => {
    setTotalBudgetKrw(localBudget);
    fetchCostEstimationData(true);
  };

  const analysis = costInsight.analysis;
  const status = costInsight.status;
  const currency = exchangeRate.fromCurrency || "USD";

  const chartData = analysis ? [
    { name: "?앸퉬", value: Number(analysis.dailyBudget.food) || 0, color: "hsl(var(--chart-1))" },
    { name: "?숈냼", value: Number(analysis.dailyBudget.accommodation) || 0, color: "hsl(var(--chart-2))" },
    { name: "援먰넻", value: Number(analysis.dailyBudget.transport) || 0, color: "hsl(var(--chart-3))" },
    { name: "愿愿?湲고?", value: Number(analysis.dailyBudget.activity) || 0, color: "hsl(var(--chart-4))" }
  ].filter(d => d.value > 0) : [];

  const startDate = userProfile?.stayStartDate ? new Date(userProfile.stayStartDate) : new Date();
  const endDate = userProfile?.stayEndDate ? new Date(userProfile.stayEndDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const stayDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyBudgetKrw = Math.round(localBudget / stayDays);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5" /> ?쇱씪 ?덉궛 遺꾨같湲?        </CardTitle>
        <CardDescription>
          <div className="font-bold text-primary text-base mb-1">珥?泥대쪟 ?덉궛: {(localBudget / 10000).toLocaleString()}留뚯썝</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <span>{userProfile?.stayStartDate} ~ {userProfile?.stayEndDate || '誘몄젙'} (珥?{stayDays}??</span>
            <span className="text-slate-300">|</span>
            <span>?섎（ 媛???덉궛: <strong>{dailyBudgetKrw.toLocaleString()}??/strong></span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                珥??덉궛 (KRW) 吏곸젒 ?낅젰
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={localBudget || ""}
                  onChange={(e) => setLocalBudget(Number(e.target.value))}
                  className="text-right pr-8 font-bold text-lg h-12"
                  min={0}
                  step={10000}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">??/span>
              </div>
            </div>
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={handleApply}
            disabled={status === "loading"}
          >
            {status === "loading" ? "遺꾩꽍 以?.." : "?ㅼ젙???덉궛?쇰줈 AI ?щ텇?앺븯湲?}
          </Button>
        </div>

        {status === "loading" && !analysis ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} ${currency}`, "?덉궛"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-semibold">{d.value.toLocaleString()} {currency}</span>
                </div>
              ))}
            </div>

            <div className="bg-muted p-3 rounded-md flex items-start gap-3 text-sm mt-4">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="leading-relaxed">{analysis.budgetComment}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            ?덉궛 遺꾩꽍 寃곌낵媛 ?놁뒿?덈떎.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
