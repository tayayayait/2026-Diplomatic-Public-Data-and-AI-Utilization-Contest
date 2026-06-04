import { lazy, Suspense, useEffect, type ComponentProps } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import { BudgetItineraryCta } from "@/components/diplolife/cards/BudgetItineraryCta";
import { ExchangeAlertBanner } from "@/components/diplolife/cards/ExchangeAlertBanner";
import { QuickConverter } from "@/components/diplolife/cards/QuickConverter";
import { LocalPriceCard } from "@/components/diplolife/cards/LocalPriceCard";
import { SmartTipsCard } from "@/components/diplolife/cards/SmartTipsCard";

export const Route = createFileRoute("/cost")({
  head: () => ({ meta: [{ title: "생활비 인사이트 - DiploLife" }] }),
  component: CostPage,
});



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
  const fetchExchangeRateData = useDiploLifeStore((state) => state.fetchExchangeRateData);
  const userProfile = useDiploLifeStore((state) => state.userProfile);

  useEffect(() => {
    fetchCostEstimationData();

    // 10분마다 환율 정보를 백그라운드에서 자동 갱신합니다.
    const intervalId = setInterval(() => {
      void fetchExchangeRateData(true);
    }, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchCostEstimationData, fetchExchangeRateData]);

  const destinationLabel = userProfile?.city || userProfile?.country || "선택한 여행지";

  // 초기 로딩 (WhereNext 데이터도 없고, 분석도 없는 상태)
  if (costInsight.status === "loading" && !costInsight.cityPrices && !costInsight.analysis) {
    return (
      <AppShell eyebrow="Cost Insight" title="현지 생활비 인사이트">
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[15px] font-medium text-muted-foreground animate-pulse">
            실제 물가 데이터를 불러오고 있습니다...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Cost Insight" title="현지 생활비 인사이트">


      {/* 1. 환율 배너 */}
      <ExchangeAlertBanner exchangeRate={exchangeRate} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

        <div className="md:col-span-2 xl:col-span-2 stagger-child" style={{ "--index": 1 } as any}>
          <ExchangeTimingAdvisor />
        </div>

        {/* 2. 즉석 환율 계산기 */}
        <div className="md:col-span-1 xl:col-span-1 stagger-child" style={{ "--index": 2 } as any}>
          <QuickConverter />
        </div>

        {/* 3. 현지 물가 체감 */}
        <div className="md:col-span-1 xl:col-span-1 stagger-child" style={{ "--index": 3 } as any}>
          <LocalPriceCard />
        </div>

        {/* 4. 일일 예산 분배기 */}
        <div className="md:col-span-1 xl:col-span-1 stagger-child" style={{ "--index": 4 } as any}>
          <DailyBudgetCard />
        </div>

        {/* 5. AI 현지 절약 팁 */}
        <div className="md:col-span-1 xl:col-span-1 stagger-child" style={{ "--index": 5 } as any}>
          <SmartTipsCard />
        </div>
        <div className="md:col-span-2 xl:col-span-3 stagger-child" style={{ "--index": 6 } as any}>
          <BudgetItineraryCta
            destinationLabel={destinationLabel}
            totalBudgetKrw={costInsight.totalBudgetKrw}
          />
        </div>

      </div>

    </AppShell>
  );
}
