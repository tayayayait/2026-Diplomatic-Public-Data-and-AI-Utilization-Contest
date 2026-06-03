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
import { AlertTriangle, ArrowRightLeft, CalendarClock, RefreshCw, TrendingUp } from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
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
    label: "Actual rate",
    color: "var(--primary)",
  },
  predicted: {
    label: "Forecast",
    color: "var(--warning)",
  },
} satisfies ChartConfig;

const currencyLabels: Record<string, string> = {
  AUD: "AUD Australian dollar",
  CAD: "CAD Canadian dollar",
  CNY: "CNY Chinese yuan",
  EUR: "EUR Euro",
  GBP: "GBP British pound",
  HKD: "HKD Hong Kong dollar",
  JPY: "JPY Japanese yen",
  KRW: "KRW Korean won",
  PHP: "PHP Philippine peso",
  SGD: "SGD Singapore dollar",
  THB: "THB Thai baht",
  TWD: "TWD Taiwan dollar",
  USD: "USD US dollar",
  VND: "VND Vietnamese dong",
};

function formatRate(rate: number, baseCurrency: string, targetCurrency: string) {
  return `1 ${baseCurrency} = ${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: rate >= 100 ? 2 : 6,
  }).format(rate)} ${targetCurrency}`;
}

function formatRateDelta(value: number, targetCurrency: string) {
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 6,
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
  const bestDateLabel = recommendation?.bestDate === "today" ? "Today" : recommendation?.bestDate ?? "No forecast";
  const bestRateDelta =
    recommendation && currentRate !== undefined ? recommendation.bestPredictedRate - currentRate : 0;
  const isForecastBusy = canFetch && (!isClientCacheReady || forecastQuery.isFetching);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="space-y-3 border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
            Exchange timing advisor
          </CardTitle>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            30-day history + 7-day forecast
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
          <label className="space-y-1.5 text-sm font-medium">
            Base currency
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
            Target currency
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
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {baseCurrency === targetCurrency && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            Choose different base and target currencies.
          </div>
        )}

        {forecastQuery.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            Exchange forecast data could not be loaded.
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
                <p className="text-xs font-semibold uppercase text-muted-foreground">Best projected rate</p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {formatRate(recommendation.bestPredictedRate, baseCurrency, targetCurrency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Change from today: {formatRateDelta(bestRateDelta, targetCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase text-primary">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Recommendation
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">{bestDateLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recommendation.action === "WAIT" ? "Waiting may improve the converted amount." : "Today is competitive in this forecast."}
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
                <ChartTooltip />
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
                <p className="text-sm font-semibold text-foreground">Compare exchange timing scenarios</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review projected results for today, 1 day, 3 days, and 7 days.
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
              Source: fxapi.app with currency API fallback. Refresh basis: {refreshTimeZone}, {refreshDate}. Cache:
              {forecastQuery.data.cache.hit ? " server hit" : " fresh fetch"}.
            </div>
          </>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-sm font-medium text-muted-foreground">
            {isForecastBusy ? "Loading exchange forecast..." : "No forecast is available yet."}
          </div>
        )}

        <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Forecasts are estimates and are not financial advice. Confirm final exchange rates with your provider.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
