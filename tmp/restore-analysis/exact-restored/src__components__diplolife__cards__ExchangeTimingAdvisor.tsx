import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  TrendingUp,
} from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
    label: "?ㅼ젣 ?섏쑉",
    color: "var(--primary)",
  },
  predicted: {
    label: "7???덉륫",
    color: "var(--warning)",
  },
} satisfies ChartConfig;

const currencyLabels: Record<string, string> = {
  AUD: "AUD ?몄＜ ?щ윭",
  CAD: "CAD 罹먮굹???щ윭",
  CNY: "CNY 以묎뎅 ?꾩븞",
  EUR: "EUR ?좊줈",
  GBP: "GBP ?곴뎅 ?뚯슫??,
  HKD: "HKD ?띿쉘 ?щ윭",
  JPY: "JPY ?쇰낯 ??,
  KRW: "KRW ??,
  PHP: "PHP ?꾨━? ?섏냼",
  SGD: "SGD ?깃??щⅤ ?щ윭",
  THB: "THB ?쒓뎅 諛뷀듃",
  TWD: "TWD ?留??щ윭",
  USD: "USD 誘멸뎅 ?щ윭",
  VND: "VND 踰좏듃????,
};

function formatRate(rate: number, baseCurrency: string, targetCurrency: string) {
  return `1 ${baseCurrency} = ${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: rate >= 100 ? 2 : 6,
  }).format(rate)} ${targetCurrency}`;
}

function formatRateDelta(value: number, targetCurrency: string) {
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: value >= 100 ? 2 : 6,
  }).format(value)} ${targetCurrency}`;
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
    () =>
      [
        "exchange-rate-forecast",
        baseCurrency,
        targetCurrency,
        refreshTimeZone,
        refreshDate,
      ] as const,
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

      writeExchangeForecastClientCache(
        getExchangeForecastClientCacheStorage(),
        clientCacheKey,
        result,
      );

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
  const bestDateLabel =
    recommendation?.bestDate === "today" ? "?ㅻ뒛" : recommendation?.bestDate ?? "?뺤떎???뺣낫 ?놁쓬";
  const bestRateDelta =
    recommendation && currentRate !== undefined ? recommendation.bestPredictedRate - currentRate : 0;
  const isForecastBusy = canFetch && (!isClientCacheReady || forecastQuery.isFetching);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="space-y-3 border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock className="h-5 w-5 text-primary" />
            ?섏쑉 ?덉륫쨌?섏쟾 ??대컢
          </CardTitle>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            諛깊뀒?ㅽ듃 湲곕컲 쨌 李멸퀬??          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
          <label className="space-y-1.5 text-sm font-medium">
            湲곗? ?듯솕
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
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <label className="space-y-1.5 text-sm font-medium">
            ????듯솕
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
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {baseCurrency === targetCurrency && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            湲곗? ?듯솕? ????듯솕媛 媛숈뒿?덈떎.
          </div>
        )}

        {forecastQuery.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            ?섏쑉 ?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??
          </div>
        )}

        {forecastQuery.data && recommendation && currentRate !== undefined ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {freshness.rateCardTitle}
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {formatRate(currentRate, baseCurrency, targetCurrency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{freshness.rateCardDescription}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">7???덉륫 理쒓퀬</p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {formatRate(recommendation.bestPredictedRate, baseCurrency, targetCurrency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ?ㅻ뒛 ?鍮?{formatRateDelta(bestRateDelta, targetCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase text-primary">
                  <TrendingUp className="h-3.5 w-3.5" />
                  ?덉륫???좊━???좎쭨
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">{bestDateLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  湲덉븸蹂??대뱷/?먰빐???쒕??덉씠?섏뿉???뺤씤
                </p>
              </div>
            </div>

            <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
              <RechartsLineChart data={chartData} margin={{ left: 12, right: 12, top: 18, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 4 }).format(Number(value))
                  }
                  width={68}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => payload?.[0]?.payload.date}
                      formatter={(value, name) => (
                        <div className="flex min-w-[11rem] items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            {name === "actual" ? "?ㅼ젣 ?섏쑉" : "7???덉륫"}
                          </span>
                          <span className="font-mono font-semibold text-foreground">
                            {formatRate(Number(value), baseCurrency, targetCurrency)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  fill="var(--color-predicted)"
                  fillOpacity={0.08}
                  stroke="none"
                />
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
              </RechartsLineChart>
            </ChartContainer>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">??湲덉븸 湲곗? ?대뱷/?먰빐 怨꾩궛</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ?ㅻ뒛, 1???? 3???? 7?????덉긽 ?섎졊?≪쓣 ?쒕줈 鍮꾧탳?⑸땲??
                </p>
              </div>
              <ExchangeSimulationDialog
                baseCurrency={baseCurrency}
                data={forecastQuery.data}
                initialAmount={1_000_000}
                targetCurrency={targetCurrency}
              />
            </div>

            <div className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {recommendation.action === "WAIT"
                    ? `${bestDateLabel}???덉륫 ?섏쑉???ㅻ뒛蹂대떎 ?좊━?⑸땲??`
                    : "?덉륫 踰붿쐞?먯꽌???ㅻ뒛 ?섏쟾??媛???좊━?⑸땲??"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ?ㅼ젣 湲덉븸 湲곗? 李⑥씠???쒗솚???쒕??덉씠??蹂닿린?앹뿉??怨꾩궛?섏꽭??
                </p>
              </div>
              <div className="text-xs font-medium text-muted-foreground md:text-right">
                API: fxapi.app 쨌 湲곗〈 CDN fallback
                <br />
                媛깆떊 湲곗?: {refreshTimeZone} 쨌 {refreshDate}
                <br />
                罹먯떆: 10遺??대궡 ?ъ궗??쨌{" "}
                {forecastQuery.data.cache.hit ? "罹먯떆 ?ъ슜" : "?좉퇋 議고쉶"}
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-sm font-medium text-muted-foreground">
            {isForecastBusy ? "?섏쑉 異붿씠? ?덉륫媛믪쓣 怨꾩궛?섎뒗 以묒엯?덈떎." : "?뺤떎???뺣낫 ?놁쓬"}
          </div>
        )}

        <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            ?섏쑉 ?덉륫? 怨쇨굅 ?섏쑉 ?⑦꽩??諛깊뀒?ㅽ듃??李멸퀬??異붿젙移섏엯?덈떎. ?ㅼ젣 ?섏쑉? 湲덈━, ?뺤콉, ?쒖옣 蹂?숈쑝濡?            ?щ씪吏????덉쑝硫??뺤젙?곸씤 湲덉쑖 議곗뼵???꾨떃?덈떎.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
