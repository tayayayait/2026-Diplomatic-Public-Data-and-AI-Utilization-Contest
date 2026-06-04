import type { ExchangeRateForecastResult } from "./api/exchange-rate";

export interface ExchangeRateChartPoint {
  actual: number | null;
  date: string;
  label: string;
  predicted: number | null;
}

const formatDateLabel = (date: string) => {
  const [, month, day] = date.split("-");

  return `${month}/${day}`;
};

export function buildExchangeRateChartData(
  data: ExchangeRateForecastResult,
): ExchangeRateChartPoint[] {
  const history = [...data.history].sort((a, b) => a.date.localeCompare(b.date));
  const latestActual = history.at(-1);
  const forecast = [...data.forecast]
    .filter((point) => point.date !== latestActual?.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  return [
    ...history.map((point) => ({
      actual: point.rate,
      date: point.date,
      label: formatDateLabel(point.date),
      predicted: point.date === latestActual?.date ? point.rate : null,
    })),
    ...forecast.map((point) => ({
      actual: null,
      date: point.date,
      label: formatDateLabel(point.date),
      predicted: point.predictedRate,
    })),
  ];
}

export function getExchangeRateDataFreshness({
  latestActualDate,
  refreshDate,
}: {
  latestActualDate?: string;
  refreshDate: string;
}) {
  const isLatestActualForRefreshDate = latestActualDate === refreshDate;

  return {
    isLatestActualForRefreshDate,
    rateCardDescription: isLatestActualForRefreshDate
      ? `현지 날짜 기준 ${refreshDate}`
      : `현지 오늘 ${refreshDate} 실측 미제공 · 최신 실측 ${latestActualDate ?? "확실한 정보 없음"}`,
    rateCardTitle: isLatestActualForRefreshDate ? "현재 환율" : "최신 실측 환율",
  };
}
