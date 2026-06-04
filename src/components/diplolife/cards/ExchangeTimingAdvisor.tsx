import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRightLeft, CalendarClock, RefreshCw, TrendingUp } from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EXCHANGE_CACHE_TTL_MS,
  exchangeCurrencyOptions,
  fetchExchangeRateForecast,
} from "@/lib/diplolife/api/exchange-rate";
import {
  buildExchangeRateChartData,
  getExchangeRateDataFreshness,
} from "@/lib/diplolife/exchange-rate-chart";
import {
  createExchangeForecastClientCacheKey,
  getExchangeForecastClientCacheStorage,
  readHydratedExchangeForecastClientCache,
  writeExchangeForecastClientCache,
} from "@/lib/diplolife/exchange-forecast-client-cache";
import {
  getLocalDateKey,
  getMsUntilNextLocalDate,
  resolveExchangeRefreshTimeZone,
} from "@/lib/diplolife/exchange-rate-refresh";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import { ExchangeSimulationDialog } from "./ExchangeSimulationDialog";

const chartConfig = {
  actual: {
    label: "실제 환율",
    color: "var(--primary)",
  },
  predicted: {
    label: "예측 환율",
    color: "var(--warning)",
  },
} satisfies ChartConfig;

const currencyLabels: Record<string, string> = {
  AUD: "AUD 호주 달러",
  CAD: "CAD 캐나다 달러",
  CNY: "CNY 중국 위안",
  EUR: "EUR 유로",
  GBP: "GBP 영국 파운드",
  HKD: "HKD 홍콩 달러",
  JPY: "JPY 일본 엔",
  KRW: "KRW 대한민국 원",
  PHP: "PHP 필리핀 페소",
  SGD: "SGD 싱가포르 달러",
  THB: "THB 태국 바트",
  TWD: "TWD 대만 달러",
  USD: "USD 미국 달러",
  VND: "VND 베트남 동",
};

function formatRate(rate: number, baseCurrency: string, targetCurrency: string) {
  const isJpyKrw = baseCurrency === "JPY" && targetCurrency === "KRW";
  const isKrwBase = baseCurrency === "KRW";
  
  if (isKrwBase) {
    return `₩1,000 = ${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: rate * 1000 >= 100 ? 2 : 4,
    }).format(rate * 1000)} ${targetCurrency}`;
  }

  const multiplier = isJpyKrw ? 100 : 1;
  const displayBase = isJpyKrw ? "100" : "1";

  return `${displayBase} ${baseCurrency} = ${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: rate * multiplier >= 100 ? 2 : 6,
  }).format(rate * multiplier)} ${targetCurrency}`;
}

function useDestinationRefreshDate(timeZone: string) {
  const [refreshDate, setRefreshDate] = useState(() => getLocalDateKey(new Date(), timeZone));

  useEffect(() => {
    setRefreshDate(getLocalDateKey(new Date(), timeZone));

    const timeout = window.setTimeout(
      () => setRefreshDate(getLocalDateKey(new Date(), timeZone)),
      getMsUntilNextLocalDate({ timeZone }) + 1000,
    );

    return () => window.clearTimeout(timeout);
  }, [refreshDate, timeZone]);

  return refreshDate;
}

export function ExchangeTimingAdvisor() {
  const queryClient = useQueryClient();
  const dashboardCurrency = useDiploLifeStore((state) => state.dashboard.exchangeRate.fromCurrency);
  const stayCountry = useDiploLifeStore((state) => state.stayCountry);
  const fetchExchangeRateData = useDiploLifeStore((state) => state.fetchExchangeRateData);
  const [baseCurrency, setBaseCurrency] = useState("KRW");
  const [targetCurrency, setTargetCurrency] = useState(
    dashboardCurrency && dashboardCurrency !== "KRW" ? dashboardCurrency : "USD",
  );
  const [hydratedCacheKey, setHydratedCacheKey] = useState<string | null>(null);

  const refreshTimeZone = useMemo(
    () =>
      resolveExchangeRefreshTimeZone({
        city: stayCountry?.city,
        countryIso2: stayCountry?.country,
      }),
    [stayCountry?.city, stayCountry?.country],
  );
  const refreshDate = useDestinationRefreshDate(refreshTimeZone);
  const canFetch = baseCurrency !== targetCurrency;
  const clientCacheKey = useMemo(
    () =>
      createExchangeForecastClientCacheKey({
        baseCurrency,
        historyDays: 30,
        refreshDate,
        refreshTimeZone,
        targetCurrency,
      }),
    [baseCurrency, refreshDate, refreshTimeZone, targetCurrency],
  );
  const queryKey = useMemo(
    () => ["exchange-rate-forecast", baseCurrency, targetCurrency, refreshTimeZone, refreshDate] as const,
    [baseCurrency, refreshDate, refreshTimeZone, targetCurrency],
  );
  const isClientCacheReady = !canFetch || hydratedCacheKey === clientCacheKey;

  useEffect(() => {
    void fetchExchangeRateData();
  }, [fetchExchangeRateData, refreshDate]);

  useEffect(() => {
    if (!canFetch) {
      setHydratedCacheKey(clientCacheKey);
      return;
    }

    const cachedForecast = readHydratedExchangeForecastClientCache(
      getExchangeForecastClientCacheStorage(),
      clientCacheKey,
      { isHydrated: true, timeZone: refreshTimeZone },
    );

    if (cachedForecast) {
      queryClient.setQueryData(queryKey, cachedForecast.data, {
        updatedAt: Date.parse(cachedForecast.cachedAt),
      });
    }

    setHydratedCacheKey(clientCacheKey);
  }, [canFetch, clientCacheKey, queryClient, queryKey, refreshTimeZone]);

  const forecastQuery = useQuery({
    enabled: canFetch && isClientCacheReady,
    gcTime: EXCHANGE_CACHE_TTL_MS,
    queryFn: async () => {
      const result = await fetchExchangeRateForecast({
        data: {
          amount: 1,
          baseCurrency,
          historyDays: 30,
          refreshTimeZone,
          targetCurrency,
        },
      });

      writeExchangeForecastClientCache(getExchangeForecastClientCacheStorage(), clientCacheKey, result);

      return result;
    },
    queryKey,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: EXCHANGE_CACHE_TTL_MS,
  });

  const chartData = useMemo(
    () => (forecastQuery.data ? buildExchangeRateChartData(forecastQuery.data) : []),
    [forecastQuery.data],
  );
  const recommendation = forecastQuery.data?.recommendation;
  const currentRate = forecastQuery.data?.history.at(-1)?.rate;
  const latestActualDate = forecastQuery.data?.history.at(-1)?.date;
  const freshness = getExchangeRateDataFreshness({
    latestActualDate,
    refreshDate,
  });
  const bestDateLabel = recommendation?.bestDate === "today" ? "오늘" : recommendation?.bestDate ?? "예측 정보 없음";
  const isForecastBusy = canFetch && (!isClientCacheReady || forecastQuery.isFetching);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="space-y-3 border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
            환전 타이밍 어드바이저
          </CardTitle>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            30일 기록 + 7일 예측
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
          <label className="space-y-1.5 text-sm font-medium">
            기준 통화
            <select
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {exchangeCurrencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyLabels[currency] ?? currency}
                </option>
              ))}
            </select>
          </label>
          <div className="hidden pb-3 text-muted-foreground md:block">
            <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
          </div>
          <label className="space-y-1.5 text-sm font-medium">
            대상 통화
            <select
              value={targetCurrency}
              onChange={(event) => setTargetCurrency(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {exchangeCurrencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyLabels[currency] ?? currency}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" onClick={() => void forecastQuery.refetch()} disabled={!canFetch}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            조회
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {baseCurrency === targetCurrency && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            기준 통화와 대상 통화를 다르게 설정해주세요.
          </div>
        )}

        {forecastQuery.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            환율 예측 데이터를 불러오지 못했습니다.
          </div>
        )}

        {forecastQuery.data && recommendation && currentRate !== undefined ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {freshness.rateCardTitle}
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {formatRate(currentRate, baseCurrency, targetCurrency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{freshness.rateCardDescription}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase text-primary">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  AI 추천
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">{bestDateLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recommendation.action === "WAIT" ? "기다리면 환전 금액이 유리해질 수 있습니다." : "이 예측에서는 오늘 환전하는 것이 가장 유리합니다."}
                </p>
              </div>
            </div>

            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <ComposedChart data={chartData} margin={{ left: 12, right: 12, top: 18, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[(dataMin: number) => dataMin * 0.995, (dataMax: number) => dataMax * 1.005]}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 4 }).format(Number(value))
                  }
                  width={68}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-actual)"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--color-predicted)"
                  strokeDasharray="6 4"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ChartContainer>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">환전 타이밍 시나리오 비교</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  오늘, 1일 후, 3일 후, 7일 후의 예상 결과를 비교해보세요.
                </p>
              </div>
              <ExchangeSimulationDialog
                baseCurrency={baseCurrency}
                data={forecastQuery.data}
                initialAmount={1_000_000}
                targetCurrency={targetCurrency}
              />
            </div>

            <div className="rounded-lg border border-border bg-background p-4 text-xs font-medium text-muted-foreground">
              출처: fxapi.app (API 백폴 포함). 기준시: {refreshTimeZone}, {refreshDate}. 캐시:
              {forecastQuery.data.cache.hit ? " 서버 캐시 적중" : " 신규 데이터"}.
            </div>
          </>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-sm font-medium text-muted-foreground">
            {isForecastBusy ? "환율 예측 데이터를 불러오는 중입니다..." : "아직 예측 데이터가 없습니다."}
          </div>
        )}

        <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            본 예측은 추정치이며 재정적 조언이 아닙니다. 실제 환전 시 이용하시는 금융기관의 최종 환율을 확인하세요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
