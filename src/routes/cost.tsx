import { lazy, Suspense, useEffect, type ComponentProps } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import { Button } from "@/components/ui/button";
import { BudgetItineraryCta } from "@/components/diplolife/cards/BudgetItineraryCta";
import { ExchangeAlertBanner } from "@/components/diplolife/cards/ExchangeAlertBanner";
import { QuickConverter } from "@/components/diplolife/cards/QuickConverter";
import { LocalPriceCard } from "@/components/diplolife/cards/LocalPriceCard";
import { SmartTipsCard } from "@/components/diplolife/cards/SmartTipsCard";

export const Route = createFileRoute("/cost")({
  head: () => ({ meta: [{ title: "?앺솢鍮??몄궗?댄듃 ??DiploLife" }] }),
  component: CostPage,
});

function formatLastUpdated(lastUpdated: string | null) {
  if (!lastUpdated) return "誘몄“??";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(lastUpdated));
}

const LazyExchangeTimingAdvisor = lazy(async () => {
  const module = await import("@/components/diplolife/cards/ExchangeTimingAdvisor");

  return { default: module.ExchangeTimingAdvisor };
});
const LazyDailyBudgetCard = lazy(async () => {
  const module = await import("@/components/diplolife/cards/DailyBudgetCard");

  return { default: module.DailyBudgetCard };
});

function DeferredCostCard() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-border bg-background p-6 text-sm font-medium text-muted-foreground">
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" />
      Loading cost insight...
    </div>
  );
}

function ExchangeTimingAdvisor(props: ComponentProps<typeof LazyExchangeTimingAdvisor>) {
  return (
    <Suspense fallback={<DeferredCostCard />}>
      <LazyExchangeTimingAdvisor {...props} />
    </Suspense>
  );
}

function DailyBudgetCard(props: ComponentProps<typeof LazyDailyBudgetCard>) {
  return (
    <Suspense fallback={<DeferredCostCard />}>
      <LazyDailyBudgetCard {...props} />
    </Suspense>
  );
}

function CostPage() {
  const exchangeRate = useDiploLifeStore((state) => state.dashboard.exchangeRate);
  const costInsight = useDiploLifeStore((state) => state.costInsight);
  const fetchCostEstimationData = useDiploLifeStore((state) => state.fetchCostEstimationData);
  const refreshDynamicInsights = useDiploLifeStore((state) => state.refreshDynamicInsights);
  const userProfile = useDiploLifeStore((state) => state.userProfile);

  useEffect(() => {
    fetchCostEstimationData();
  }, [fetchCostEstimationData]);

  const handleRefreshCostInsight = () => {
    void refreshDynamicInsights();
  };
  const destinationLabel = userProfile?.city || userProfile?.country || "?좏깮???ы뻾吏";

  // 珥덇린 濡쒕뵫 (WhereNext ?곗씠?곕룄 ?녾퀬, 遺꾩꽍???녿뒗 ?곹깭)
  if (costInsight.status === "loading" && !costInsight.cityPrices && !costInsight.analysis) {
    return (
      <AppShell eyebrow="Cost Insight" title="?꾩? ?앺솢鍮??몄궗?댄듃">
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[15px] font-medium text-muted-foreground animate-pulse">
            ?ㅼ젣 臾쇨? ?곗씠?곕? 遺덈윭?ㅺ퀬 ?덉뒿?덈떎??          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Cost Insight" title="?꾩? ?앺솢鍮??몄궗?댄듃">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          ?앺솢鍮?留덉?留?媛깆떊: {formatLastUpdated(costInsight.updatedAt)}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2"
          disabled={costInsight.status === "loading"}
          onClick={handleRefreshCostInsight}
        >
          <RefreshCw className={`h-4 w-4 ${costInsight.status === "loading" ? "animate-spin" : ""}`} />
          媛깆떊
        </Button>
      </div>

      {/* 1. ?섏쑉 諛곕꼫 */}
      <ExchangeAlertBanner exchangeRate={exchangeRate} />

      <div className="grid gap-6 md:grid-cols-2">

        <div className="md:col-span-2 stagger-child" style={{ "--index": 1 } as any}>
          <ExchangeTimingAdvisor />
        </div>

        {/* 2. 利됱꽍 ?섏쑉 怨꾩궛湲?*/}
        <div className="md:col-span-1 stagger-child" style={{ "--index": 2 } as any}>
          <QuickConverter />
        </div>

        {/* 3. ?꾩? 臾쇨? 泥닿컧??*/}
        <div className="md:col-span-1 stagger-child" style={{ "--index": 3 } as any}>
          <LocalPriceCard />
        </div>

        {/* 4. ?쇱씪 ?덉궛 遺꾨같湲?*/}
        <div className="md:col-span-1 stagger-child" style={{ "--index": 4 } as any}>
          <DailyBudgetCard />
        </div>

        {/* 5. AI 異붿쿇 & ?덉빟??*/}
        <div className="md:col-span-1 stagger-child" style={{ "--index": 5 } as any}>
          <SmartTipsCard />
        </div>

        <div className="md:col-span-2 stagger-child" style={{ "--index": 6 } as any}>
          <BudgetItineraryCta
            destinationLabel={destinationLabel}
            totalBudgetKrw={costInsight.totalBudgetKrw}
          />
        </div>

      </div>

    </AppShell>
  );
}
