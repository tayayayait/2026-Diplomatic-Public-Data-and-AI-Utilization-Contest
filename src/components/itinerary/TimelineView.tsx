import { useEffect, useRef } from "react";
import { Clock, Home, Map as MapIcon, MapPin, Navigation, Route, Star, Wallet } from "lucide-react";

import type { ItineraryPlace } from "@/lib/gemini/schema";
import {
  createReturnHomeStep,
  createTimelinePlaceViewModels,
} from "@/lib/itinerary/timeline-view-model";
import { buildGoogleMapsPlaceUrl } from "@/lib/diplolife/maps";
import { cn } from "@/lib/utils";
import { PlaceThumbnail } from "./PlaceThumbnail";

interface TimelineViewProps {
  places: ItineraryPlace[];
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  onShowMapRoute?: () => void;
}

const createRatingLabel = (place: ItineraryPlace) => {
  const rating = place.recommendationContext?.rating;
  if (typeof rating !== "number") return "평점 없음";

  const reviewCount = place.recommendationContext?.userRatingCount;
  const reviewLabel =
    typeof reviewCount === "number" ? ` 리뷰 ${reviewCount.toLocaleString("ko-KR")}` : "";

  return `${rating.toFixed(1)}${reviewLabel}`;
};

const createTravelModeLabel = (place: ItineraryPlace) => place.travelMode ?? "Route unavailable";

export function TimelineView({ places, selectedIndex, onSelect, onShowMapRoute }: TimelineViewProps) {
  const cardRefs = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    if (selectedIndex == null) return;

    const selectedCard = cardRefs.current.get(selectedIndex);
    if (!selectedCard) return;

    selectedCard.scrollIntoView({ behavior: "smooth", block: "center" });
    selectedCard.focus({ preventScroll: true });
  }, [selectedIndex]);

  if (places.length === 0) return null;

  const timelinePlaces = createTimelinePlaceViewModels(places);
  const returnHomeStep = createReturnHomeStep(places);

  return (
    <div className="flex flex-col gap-3 py-3 pl-1 pr-2">
      {onShowMapRoute && (
        <div className="mb-2 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Navigation className="h-4 w-4 text-primary" />
            전체 경로
          </div>
          <button
            type="button"
            onClick={onShowMapRoute}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <MapIcon className="h-3.5 w-3.5" />
            지도에서 경로 보기
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
          <Home className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-5 text-foreground">숙소에서 출발</div>
          <div className="text-xs leading-5 text-muted-foreground">첫 번째 추천 장소는 숙소 위치를 기준으로 연결됩니다.</div>
        </div>
      </div>

      {timelinePlaces.map((item) => {
        const isSelected = selectedIndex === item.index;
        const travelMode = createTravelModeLabel(item.place);
        const travelSummary = `${travelMode} · ${item.travelMinutes}분`;
        const googleMapsUrl = buildGoogleMapsPlaceUrl({
          name: item.place.placeName,
          googlePlaceId: item.place.googlePlaceId,
        });

        return (
          <article
            key={`${item.place.placeName}-${item.order}`}
            aria-current={isSelected ? "location" : undefined}
            data-map-marker-number={item.order}
            data-selected-card={isSelected ? "true" : undefined}
            ref={(node) => {
              if (node) {
                cardRefs.current.set(item.index, node);
                return;
              }

              cardRefs.current.delete(item.index);
            }}
            tabIndex={isSelected ? -1 : undefined}
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/10 shadow-xl shadow-primary/15 ring-2 ring-primary/20"
                : "border-border bg-surface hover:border-primary/30 hover:shadow-md",
            )}
          >
            {isSelected && (
              <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
            )}
            <button
              type="button"
              aria-label={`Select ${item.title} on the map`}
              onClick={() => onSelect?.(item.index)}
              className={cn(
                "mb-3 flex w-full items-start justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isSelected ? "text-primary" : "text-foreground",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black shadow-sm",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-primary/30"
                      : item.isMeal
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : "border-border bg-background text-foreground",
                  )}
                  aria-hidden="true"
                >
                  {item.order}
                </div>
                <PlaceThumbnail
                  photoUrl={item.photoUrl}
                  category={item.place.category}
                  isMeal={item.isMeal}
                  size="sm"
                />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    장소
                  </span>
                  <h3 className="break-keep text-base font-bold leading-6">{item.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold leading-5",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-foreground",
                      )}
                    >
                      지도 마커 {item.order}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-semibold leading-5 text-muted-foreground">
                      장소 유형
                    </span>
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold leading-5 text-primary">
                      {item.categoryLabel}
                    </span>
                    {item.isMeal && (
                      <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold leading-5 text-orange-700">
                        {item.mealLabel}
                      </span>
                    )}
                  </div>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold leading-5 text-primary">
                    <Clock className="h-3 w-3" />
                    이동 수단 {travelSummary}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold leading-4",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                #{item.order}
              </span>
            </button>

            <div className="grid gap-3 text-sm leading-6">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  장소 소개
                </div>
                <p className="break-keep text-xs leading-5 text-foreground/80">
                  {item.placeIntroduction}
                </p>
              </div>

              <div className="grid gap-2">
                <div className="rounded-md bg-background px-3 py-2">
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    예상 체류 시간
                  </div>
                  <p className="break-keep text-xs leading-5 text-muted-foreground">
                    {item.estimatedMinutes}분
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-background px-3 py-2">
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Star className="h-3.5 w-3.5 text-primary" />
                    평점
                  </div>
                  <p className="break-keep text-xs leading-5 text-muted-foreground">
                    {createRatingLabel(item.place)}
                  </p>
                </div>
                <div className="rounded-md bg-background px-3 py-2">
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    예상 비용
                  </div>
                  <p className="break-all text-xs leading-5 text-muted-foreground">{item.estimatedCost}</p>
                </div>
                <div className="rounded-md bg-background px-3 py-2">
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    이전 장소에서 이동
                  </div>
                  <p className="break-keep text-xs leading-5 text-muted-foreground">
                    {travelSummary} · {item.travelDistance}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Route className="h-3.5 w-3.5 text-primary" />
                  지도 위치 및 경로
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelect?.(item.index)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  구글 지도로 열기
                </a>
              </div>
            </div>
          </article>
        );
      })}

      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
          <Home className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-5 text-foreground">{returnHomeStep.title}</div>
          <div className="text-xs leading-5 text-muted-foreground">{returnHomeStep.description}</div>
        </div>
      </div>
    </div>
  );
}
