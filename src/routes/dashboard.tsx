import { useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/diplolife/AppShell";
import { createDashboardViewModel } from "@/lib/diplolife/dashboard";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import { SafetyScoreCard } from "@/components/diplolife/cards/SafetyScoreCard";
import { VisaDdayCard } from "@/components/diplolife/cards/VisaDdayCard";
import { ExchangeRateCard } from "@/components/diplolife/cards/ExchangeRateCard";
import { WeatherCard } from "@/components/diplolife/cards/WeatherCard";
import { NoticeCard } from "@/components/diplolife/cards/NoticeCard";
import { AiRecommendationCard } from "@/components/diplolife/cards/AiRecommendationCard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "대시보드 | DiploLife" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const dashboard = useDiploLifeStore((state) => state.dashboard);
  const stayCountry = useDiploLifeStore((state) => state.stayCountry);
  const userProfile = useDiploLifeStore((state) => state.userProfile);
  const weatherAlerts = useDiploLifeStore((state) => state.weatherAlerts);
  const fetchDashboardData = useDiploLifeStore((state) => state.fetchDashboardData);

  useEffect(() => {
    const loadData = async () => {
      const currentState = useDiploLifeStore.getState();
      if (!currentState.userProfile) {
        await currentState.fetchUserProfileFromSupabase();
      }
      const latestState = useDiploLifeStore.getState();
      void latestState.fetchDashboardData();
      void latestState.fetchWeatherData();
    };
    loadData();
  }, []);
  const viewModel = useMemo(
    () => createDashboardViewModel({ dashboard, stayCountry, userProfile, weatherAlerts }),
    [dashboard, stayCountry, userProfile, weatherAlerts],
  );

  return (
    <AppShell eyebrow="Dashboard" title={viewModel.title}>
      <div className="mb-5 text-[14px] leading-6 text-muted-foreground">{viewModel.subtitle}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 stagger-child" style={{ "--index": 1 } as any}>
        {viewModel.cards.map((card) => {
          switch (card.id) {
            case "safety":
              return <SafetyScoreCard key={card.id} card={card} />;
            case "visa":
              return <VisaDdayCard key={card.id} card={card} />;
            case "exchange":
              return <ExchangeRateCard key={card.id} card={card} />;
            case "weather":
              return <WeatherCard key={card.id} card={card} />;
            case "notices":
              return <NoticeCard key={card.id} card={card} />;
            case "ai":
              return <AiRecommendationCard key={card.id} card={card} />;
            default:
              return null;
          }
        })}
      </div>
    </AppShell>
  );
}
