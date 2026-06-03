import {
  CircleDollarSign,
  Coffee,
  ExternalLink,
  Info,
  Map,
  MapPin,
  Route,
  Star,
  Utensils,
} from "lucide-react";
import type { PlaceRecommendation } from "../../../lib/diplolife/api/gemini-recommendation";
import { buildGoogleMapsPlaceUrl } from "../../../lib/diplolife/maps";

interface PlaceCardProps {
  place: PlaceRecommendation;
}

export function PlaceCard({ place }: PlaceCardProps) {
  const mapsUrl = buildGoogleMapsPlaceUrl(place);
  const placeSourceLabel = place.placeDataSource === "google_places" ? "Google Places ?뺤씤" : "Google ?뺣낫 ?놁쓬";
  const travelSourceLabel = place.travelTimeSource === "google_routes" ? "Google Routes" : "Google ?뺣낫 ?놁쓬";
  const costSourceLabel =
    place.costSource === "google_places_price_range"
      ? "Google 媛寃?踰붿쐞"
      : place.costSource === "google_places_price_level"
        ? "Google 媛寃⑸?"
        : place.costSource === "google_places_price_unavailable"
          ? "Places 媛寃??꾨뱶 誘몄젣怨?"
          : "Not set";
  const hasGooglePrice =
    place.costSource === "google_places_price_range" || place.costSource === "google_places_price_level";
  const priceCheckUrl = place.websiteUri ?? mapsUrl;
  const priceCheckLabel = place.websiteUri ? "怨듭떇 ?ъ씠??媛寃??뺤씤" : "Google Maps?먯꽌 ?뺤씤";

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "restaurant":
        return <Utensils className="w-4 h-4 text-orange-500" />;
      case "cafe":
        return <Coffee className="w-4 h-4 text-amber-600" />;
      case "tourist_spot":
        return <Map className="w-4 h-4 text-emerald-500" />;
      default:
        return <MapPin className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "restaurant":
        return "?앸떦";
      case "cafe":
        return "移댄럹";
      case "tourist_spot":
        return "愿愿묒?";
      default:
        return "湲고?";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3 group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center">
          <div className="p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
            {getTypeIcon(place.type)}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {place.name}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {getTypeLabel(place.type)}
            </span>
          </div>
        </div>
        
        {place.rating && (
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {place.rating}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-900/20">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-200">
          <Info className="h-3.5 w-3.5" />
          ?μ냼 ?뚭컻
        </div>
        <p className="text-xs leading-5 text-blue-800 dark:text-blue-300">
          {place.description}
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
        <div className="flex flex-col gap-1.5">
          {place.travelTimeFromPreviousMinutes && (
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Route className="w-3.5 h-3.5" />
              <span>
                ?댁쟾 ?μ냼?먯꽌 ??{place.travelTimeFromPreviousMinutes}遺??대룞
                {place.distanceMetersFromPrevious ? ` 쨌 ${(place.distanceMetersFromPrevious / 1000).toFixed(1)}km` : ""}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {place.costDisplayText ?? "Google Places 媛寃??꾨뱶 誘명솗??"}
            </div>
            {!hasGooglePrice && (
              <a
                href={priceCheckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                {priceCheckLabel}
              </a>
            )}
          </div>
        </div>
        
        <a 
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${place.name} Google 吏?꾩뿉??蹂닿린`}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-end mb-1"
        >
          <MapPin className="w-3 h-3" />
          吏??蹂닿린
        </a>
      </div>

      <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60">
          <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>
            <strong className="text-slate-800 dark:text-slate-100">?대룞:</strong>{" "}
            {place.travelTimeBasis ?? "?곗젙 湲곗? ?놁쓬"} 쨌 {travelSourceLabel}
          </span>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60">
          <CircleDollarSign className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            <strong className="text-slate-800 dark:text-slate-100">鍮꾩슜:</strong>{" "}
            {place.costBasis ?? "?곗젙 湲곗? ?놁쓬"} 쨌 {costSourceLabel}
          </span>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span>
            <strong className="text-slate-800 dark:text-slate-100">?μ냼:</strong>{" "}
            {place.openingHoursText || place.reviewSummary || placeSourceLabel}
          </span>
        </div>
      </div>
      
    </div>
  );
}
