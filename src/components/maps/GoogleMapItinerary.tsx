import { useEffect, useMemo, useState } from "react";
import { AdvancedMarker, Map, Marker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Home, Route } from "lucide-react";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import {
  createMapMarkerViewModels,
  createMapRoutePoints,
  createMapRouteSegments,
  resolveAccommodationCoords,
  resolveGoogleMapId,
  type LatLng,
} from "@/lib/itinerary/map-route-view-model";
import { cn } from "@/lib/utils";
import { MapDirectionsRoute } from "./MapDirectionsRoute";

type GeocoderResult = {
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
};

interface Props {
  places: ItineraryPlace[];
  selectedPlaceIndex?: number | null;
  onPlaceSelect?: (index: number) => void;
  accommodationLocation?: string;
  accommodationLat?: number | null;
  accommodationLng?: number | null;
  city?: string;
}

const fallbackCenter: LatLng = { lat: 37.5665, lng: 126.978 };
const accommodationMarkerIcon =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#047857" stroke="#ffffff" stroke-width="4"/>
      <path d="M13 23.5 22 15l9 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-5v-7h-5v7h-5A1.5 1.5 0 0 1 13 33.5z" fill="#ffffff"/>
      <path d="M11.5 24.5 22 14l10.5 10.5" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `);
type AccommodationMarkerViewModel = Extract<
  ReturnType<typeof createMapMarkerViewModels>[number],
  { kind: "accommodation" }
>;

export function GoogleMapItinerary({
  places,
  selectedPlaceIndex,
  onPlaceSelect,
  accommodationLocation,
  accommodationLat,
  accommodationLng,
  city,
}: Props) {
  const map = useMap();
  const geocodingLib = useMapsLibrary("geocoding");
  const [geocodedAccommodationCoords, setGeocodedAccommodationCoords] = useState<LatLng | null>(null);

  const storedAccommodationCoords = useMemo(
    () => resolveAccommodationCoords({ accommodationLat, accommodationLng }),
    [accommodationLat, accommodationLng],
  );
  const accommodationCoords = storedAccommodationCoords ?? geocodedAccommodationCoords;

  useEffect(() => {
    if (storedAccommodationCoords) {
      setGeocodedAccommodationCoords(null);
      return;
    }

    if (!geocodingLib || !accommodationLocation) {
      setGeocodedAccommodationCoords(null);
      return;
    }

    let isCancelled = false;
    const geocoder = new geocodingLib.Geocoder();
    const query = city ? `${city} ${accommodationLocation}` : accommodationLocation;

    geocoder.geocode({ address: query }, (results: GeocoderResult[] | null, status: string) => {
      if (isCancelled) return;

      if (status === "OK" && results?.[0]) {
        setGeocodedAccommodationCoords({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
        return;
      }

      setGeocodedAccommodationCoords(null);
    });

    return () => {
      isCancelled = true;
    };
  }, [geocodingLib, accommodationLocation, city, storedAccommodationCoords]);

  const routePoints = useMemo(
    () => createMapRoutePoints({ accommodationCoords, places }),
    [accommodationCoords, places],
  );
  const markerModels = useMemo(
    () => createMapMarkerViewModels({ accommodationCoords, places, selectedPlaceIndex }),
    [accommodationCoords, places, selectedPlaceIndex],
  );
  const accommodationMarker = markerModels.find(
    (marker): marker is AccommodationMarkerViewModel => marker.kind === "accommodation",
  );
  const routeSegments = useMemo(
    () => createMapRouteSegments(routePoints, places),
    [routePoints, places],
  );
  const routePath = useMemo(() => routePoints.map(({ lat, lng }) => ({ lat, lng })), [routePoints]);
  const visitOrderLabels = useMemo(
    () =>
      routePoints.map((point) =>
        point.kind === "accommodation"
          ? "숙소"
          : String(places[point.placeIndex]?.order || point.placeIndex + 1),
      ),
    [places, routePoints],
  );
  const mapId = resolveGoogleMapId(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID);
  const canUseAdvancedMarkers = Boolean(mapId);
  const selectedRouteSegments = useMemo(
    () =>
      selectedPlaceIndex == null
        ? []
        : routeSegments.filter((segment) => segment.destinationPlaceIndex === selectedPlaceIndex),
    [routeSegments, selectedPlaceIndex],
  );
  const routeSummarySegments = useMemo(
    () => routeSegments.filter((segment) => segment.destinationPlaceIndex !== undefined),
    [routeSegments],
  );
  const selectedRouteSummary = useMemo(
    () =>
      selectedPlaceIndex == null
        ? undefined
        : routeSummarySegments.find(
            (segment) => segment.destinationPlaceIndex === selectedPlaceIndex,
          ),
    [routeSummarySegments, selectedPlaceIndex],
  );
  const visibleRouteSummaries = selectedRouteSummary
    ? [selectedRouteSummary]
    : routeSummarySegments.slice(0, 3);

  useEffect(() => {
    if (!map || routePath.length === 0) return;
    if (!window.google?.maps?.LatLngBounds) return;

    const bounds = new window.google.maps.LatLngBounds();
    routePath.forEach((point) => bounds.extend(point));

    map.fitBounds(bounds, { top: 56, bottom: 56, left: 56, right: 56 });
  }, [map, routePath]);

  const defaultCenter = routePath[0] ?? fallbackCenter;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border">
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={13}
        mapId={mapId}
        gestureHandling="greedy"
        disableDefaultUI={true}
      >

        {selectedRouteSegments.length > 0 && (
          <MapDirectionsRoute
            segments={selectedRouteSegments}
            color="#f97316"
            opacity={0.95}
            weight={6}
            zIndex={4}
          />
        )}

        {accommodationMarker && canUseAdvancedMarkers && (
          <AdvancedMarker position={accommodationMarker.position} zIndex={35}>
            <div className="group relative flex cursor-pointer flex-col items-center">
              <div className="absolute inset-0 scale-150 animate-ping rounded-full bg-emerald-500/25" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-emerald-700 text-white shadow-xl shadow-emerald-900/25">
                <Home className="h-5 w-5" />
              </div>
              <div className="absolute top-full mt-1.5 whitespace-nowrap rounded-md border border-emerald-100 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-900 shadow-md">
                {accommodationMarker.label}
              </div>
            </div>
          </AdvancedMarker>
        )}
        {accommodationMarker && !canUseAdvancedMarkers && (
          <Marker
            icon={accommodationMarkerIcon}
            position={accommodationMarker.position}
            title={accommodationMarker.title}
            zIndex={35}
          />
        )}

        {markerModels.map((marker) => {
          if (marker.kind !== "place") return null;

          const isSelected = marker.isSelected;
          const markerPosition = marker.position;

          if (!canUseAdvancedMarkers) {
            return (
              <Marker
                key={marker.id}
                position={markerPosition}
                title={marker.title}
                label={String(marker.markerNumber)}
                onClick={() => onPlaceSelect?.(marker.placeIndex)}
                zIndex={isSelected ? 45 : marker.isMeal ? 20 : 10}
              />
            );
          }

          return (
            <AdvancedMarker
              key={marker.id}
              position={markerPosition}
              onClick={() => onPlaceSelect?.(marker.placeIndex)}
              className="cursor-pointer"
              zIndex={isSelected ? 45 : marker.isMeal ? 20 : 10}
            >
              <div
                className={cn(
                  "group relative flex flex-col items-center transition-transform duration-200",
                  isSelected && "-translate-y-1 scale-125",
                )}
              >
                {isSelected && (
                  <div className="absolute inset-0 scale-150 animate-ping rounded-full bg-orange-500/30" />
                )}
                <div
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black shadow-lg",
                    isSelected && "border-white bg-orange-600 text-white shadow-orange-500/40 ring-4 ring-orange-300/35",
                    !isSelected && marker.tone === "meal" && "border-orange-200 bg-orange-100 text-orange-800",
                    !isSelected && marker.tone === "place" && "border-slate-200 bg-white text-slate-900",
                  )}
                >
                  {marker.markerNumber}
                </div>
                <div
                  className={cn(
                    "absolute top-full mt-1 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-bold shadow-md backdrop-blur-sm transition-opacity",
                    isSelected && "border-orange-500 bg-orange-600 text-white opacity-100",
                    !isSelected && "border-slate-200/70 bg-white/95 text-slate-700 opacity-0 group-hover:opacity-100",
                  )}
                >
                  {isSelected ? `선택됨 / 지도 마커 ${marker.markerNumber}` : `지도 마커 ${marker.markerNumber}`}
                  <span className="ml-1 font-semibold">{marker.title}</span>
                </div>
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>
      {visitOrderLabels.length > 1 && (
        <div className="absolute left-3 right-3 top-3 rounded-xl border border-border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2 font-bold text-foreground">
            <Route className="h-3.5 w-3.5 text-primary" />
            방문 순서 및 이동 경로
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {visitOrderLabels.map((label, index) => {
              const isAccommodation = label === "숙소";

              return (
                <div key={`${label}-${index}`} className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex h-7 items-center justify-center rounded-full border px-2 text-[11px] font-black",
                      isAccommodation
                        ? "border-emerald-200 bg-emerald-700 text-white"
                        : "border-primary/20 bg-primary/10 text-primary",
                    )}
                  >
                    {isAccommodation ? <Home className="h-3.5 w-3.5" /> : label}
                  </span>
                  {index < visitOrderLabels.length - 1 && (
                    <span className="text-muted-foreground" aria-hidden="true">
                      -&gt;
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {visibleRouteSummaries.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-bold text-foreground">이동 구간</span>
            <span className="text-muted-foreground">
              {selectedRouteSummary ? "선택 구간" : "주요 구간"}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {visibleRouteSummaries.map((segment) => {
              const placeIndex = segment.destinationPlaceIndex ?? 0;
              const label = places[placeIndex]?.koName ?? `Stop ${placeIndex + 1}`;
              const markerNumber = places[placeIndex]?.order || placeIndex + 1;

              return (
                <button
                  key={`${placeIndex}-${segment.minutes ?? "unknown"}`}
                  type="button"
                  onClick={() => onPlaceSelect?.(placeIndex)}
                  className={cn(
                    "shrink-0 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                    selectedPlaceIndex === placeIndex
                      ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                      : "border-border bg-surface text-foreground hover:border-primary/40",
                  )}
                >
                  <span className="block max-w-40 truncate font-semibold">
                    #{markerNumber} {label}
                  </span>
                  <span className="text-muted-foreground">
                    {segment.minutes ?? "-"}분 / {segment.distance ?? "거리 정보 없음"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
