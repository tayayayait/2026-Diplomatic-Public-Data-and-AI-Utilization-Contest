import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CloudRain,
  Info,
  Loader2,
  Shirt,
  Sun,
  SunMedium,
  ThermometerSun,
  Umbrella,
  Wind,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import type { WeatherForecastDay } from "@/lib/diplolife/api/types";

export const Route = createFileRoute("/weather")({
  head: () => ({ meta: [{ title: "날씨 상세 - DiploLife" }] }),
  component: WeatherPage,
});

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

function isRainy(day: WeatherForecastDay) {
  return (
    (day.weatherCode !== undefined && RAIN_CODES.has(day.weatherCode)) ||
    (day.precipitationProbabilityMax ?? 0) >= 50 ||
    (day.precipitationMm ?? 0) > 0
  );
}

function formatWholeNumber(value: number | undefined, suffix = "") {
  return value === undefined ? "-" : `${value.toFixed(0)}${suffix}`;
}

function formatOneDecimal(value: number | undefined, suffix = "") {
  return value === undefined ? "-" : `${value.toFixed(1)}${suffix}`;
}

function formatDate(date: string, pattern: string) {
  return format(parseISO(date), pattern);
}

function WeatherPage() {
  const stayCountry = useDiploLifeStore((state) => state.stayCountry);
  const profile = useDiploLifeStore((state) => state.userProfile);
  const weatherForecast = useDiploLifeStore((state) => state.weatherForecast);
  const weatherAlert = useDiploLifeStore((state) => state.weatherAlerts[0]);
  const fetchWeatherData = useDiploLifeStore((state) => state.fetchWeatherData);

  useEffect(() => {
    if (!stayCountry) return;
    void fetchWeatherData();
  }, [
    fetchWeatherData,
    stayCountry?.city,
    stayCountry?.country,
    stayCountry?.stayEndDate,
    stayCountry?.stayStartDate,
  ]);

  const forecastDays = weatherForecast?.days ?? [];
  const isLoading = weatherAlert?.status === "loading";
  const hasRain = forecastDays.some(isRainy);
  const maxTemp = forecastDays.length
    ? Math.max(...forecastDays.map((day) => day.tempMaxC ?? Number.NEGATIVE_INFINITY))
    : null;
  const maxUv = forecastDays.length ? Math.max(...forecastDays.map((day) => day.uvIndexMax ?? 0)) : 0;
  const sourceMeta = weatherForecast
    ? `Open-Meteo · ${weatherForecast.timezone ?? "timezone auto"} · ${weatherForecast.fetchedAt.slice(0, 10)} 조회`
    : "Open-Meteo";

  const recommendations = useMemo(() => {
    if (forecastDays.length === 0) {
      return [
        {
          icon: AlertCircle,
          title: "출국 직전 상황",
          description: weatherForecast?.summary ?? "현재 표시할 예보가 없습니다.",
          className: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
        },
      ];
    }

    return [
      hasRain
        ? {
            icon: Umbrella,
            title: "우산 챙기기",
            description: "예보 범위 내 비 가능성이 있습니다. 접이식 우산을 준비하세요.",
            className: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
          }
        : null,
      maxUv >= 6
        ? {
            icon: SunMedium,
            title: "선크림 필수",
            description: "자외선 지수가 높을 수 있습니다. SPF 50 이상을 권장합니다.",
            className: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
          }
        : null,
      {
        icon: Shirt,
        title: maxTemp !== null && maxTemp > 25 ? "가벼운 반팔 위주" : "여벌의 겉옷",
        description:
          maxTemp !== null && maxTemp > 25
            ? "최고 기온이 높습니다. 통풍이 잘 되는 옷을 챙기세요."
            : "일교차에 대비해 가벼운 겉옷을 준비하세요.",
        className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
      },
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [forecastDays.length, hasRain, maxTemp, maxUv, weatherForecast?.summary]);

  if (!stayCountry) {
    return (
      <AppShell eyebrow="Weather Info" title="현지 날씨 상세">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          여행 정보가 없습니다.
        </div>
      </AppShell>
    );
  }

  const startDate = parseISO(stayCountry.stayStartDate);
  const endDate = stayCountry.stayEndDate ? parseISO(stayCountry.stayEndDate) : null;

  return (
    <AppShell eyebrow="Weather Info" title="현지 날씨 상세">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <article
          className="col-span-full rounded-3xl border border-border bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6 shadow-sm stagger-child"
          style={{ "--index": 1 } as any}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-black text-foreground">
              {profile?.country || stayCountry.country} {stayCountry.city && `- ${stayCountry.city}`}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              여행 기간: {format(startDate, "yyyy.MM.dd")} ~{" "}
              {endDate ? format(endDate, "yyyy.MM.dd") : "미정"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{sourceMeta}</p>
          </div>
        </article>

        {isLoading && (
          <article className="col-span-full flex items-center gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">
              Open-Meteo에서 현지 좌표와 예보를 조회 중입니다.
            </p>
          </article>
        )}

        {weatherForecast && weatherForecast.status !== "success" && (
          <article className="col-span-full rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-[15px] font-bold">{weatherForecast.summary}</h2>
                {weatherForecast.notices?.[0] && (
                  <p className="mt-1 text-[13px] leading-6">{weatherForecast.notices[0]}</p>
                )}
              </div>
            </div>
          </article>
        )}

        <article
          className="col-span-full rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-1 stagger-child"
          style={{ "--index": 2 } as any}
        >
          <div className="mb-6 flex items-center gap-3">
            <Info className="h-6 w-6 text-indigo-500" />
            <h2 className="text-[18px] font-bold">여행 준비물 추천</h2>
          </div>

          <div className="space-y-4">
            {recommendations.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className={`flex items-center gap-4 rounded-2xl p-4 ${item.className}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-foreground">{item.title}</h4>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article
          className="col-span-full rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2 stagger-child"
          style={{ "--index": 3 } as any}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ThermometerSun className="h-6 w-6 text-orange-500" />
              <h2 className="text-[18px] font-bold">일자별 날씨 예보</h2>
            </div>
          </div>

          {forecastDays.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-alt/50 p-6 text-[14px] text-muted-foreground">
              {isLoading ? "예보를 불러오는 중입니다." : (weatherForecast?.summary ?? "확실한 예보 정보 없음")}
            </div>
          ) : (
            <div className="space-y-3">
              {forecastDays.map((day) => {
                const rainy = isRainy(day);
                const Icon = rainy ? CloudRain : Sun;

                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-start justify-between rounded-2xl border border-border/50 bg-surface p-4 sm:flex-row sm:items-center"
                  >
                    <div className="mb-3 flex items-center gap-4 sm:mb-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 text-[15px] font-bold">
                          {formatDate(day.date, "MM.dd")}
                          <span className="text-[13px] font-normal text-muted-foreground">
                            ({formatDate(day.date, "EEEE")})
                          </span>
                        </h4>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">{day.weatherLabel}</p>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-5 px-2 sm:w-auto sm:justify-end sm:px-0">
                      <div className="text-center">
                        <p className="mb-1 text-[11px] text-muted-foreground">기온</p>
                        <p className="text-[15px] font-bold">
                          {formatWholeNumber(day.tempMinC, "째")} / {formatWholeNumber(day.tempMaxC, "째")}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="mb-1 text-[11px] text-muted-foreground">강수확률</p>
                        <p className="text-[15px] font-bold text-blue-500">
                          {formatWholeNumber(day.precipitationProbabilityMax, "%")}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="mb-1 text-[11px] text-muted-foreground">풍속</p>
                        <p className="flex items-center justify-center gap-1 text-[15px] font-bold">
                          <Wind className="h-3 w-3" /> {formatOneDecimal(day.windSpeedKmhMax, "km/h")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </AppShell>
  );
}
