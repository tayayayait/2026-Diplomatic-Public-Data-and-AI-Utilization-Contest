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
      ? `?꾩? ?좎쭨 湲곗? ${refreshDate}`
      : `?꾩? ?ㅻ뒛 ${refreshDate} ?ㅼ륫 誘몄젣怨?쨌 理쒖떊 ?ㅼ륫 ${latestActualDate ?? "?뺤떎???뺣낫 ?놁쓬"}`,
    rateCardTitle: isLatestActualForRefreshDate ? "?꾩옱 ?섏쑉" : "理쒖떊 ?ㅼ륫 ?섏쑉",
  };
}
