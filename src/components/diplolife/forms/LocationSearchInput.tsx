import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ExternalLink, LocateFixed, Map as MapIcon, Navigation, Search } from "lucide-react";

declare global {
  interface Window {
    google: any;
    __diploLifeGoogleMapsReady?: () => void;
  }
}

interface LocationSearchInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onResolvedLocation?: (location: ResolvedLocation) => void;
  loadGoogleMapsScript?: boolean;
  placeholder?: string;
  className?: string;
}

export interface ResolvedLocation {
  address: string;
  lat?: number;
  lng?: number;
}

const getLocationCoordinate = (location: any, key: "lat" | "lng") => {
  const value = location?.[key];
  const coordinate = typeof value === "function" ? value.call(location) : value;

  return typeof coordinate === "number" && Number.isFinite(coordinate) ? coordinate : undefined;
};

const createResolvedAddress = ({
  fallbackAddress,
  formattedAddress,
  name,
}: {
  fallbackAddress: string;
  formattedAddress?: string;
  name?: string;
}) => {
  const normalizedName = name?.trim();
  const normalizedAddress = formattedAddress?.trim() || fallbackAddress.trim();

  if (normalizedName && normalizedAddress && !normalizedAddress.startsWith(normalizedName)) {
    return `${normalizedName}, ${normalizedAddress}`;
  }

  return normalizedAddress || normalizedName || fallbackAddress.trim();
};

export function createResolvedLocationFromGooglePlace(place: any, fallbackAddress: string): ResolvedLocation | null {
  const address = createResolvedAddress({
    fallbackAddress,
    formattedAddress: place?.formatted_address,
    name: place?.name,
  });
  if (!address) return null;

  const location = place?.geometry?.location;
  const lat = getLocationCoordinate(location, "lat");
  const lng = getLocationCoordinate(location, "lng");

  return {
    address,
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  };
}

export function createResolvedLocationFromGeocoderResult(
  result: any,
  fallbackAddress: string,
): ResolvedLocation | null {
  const address = createResolvedAddress({
    fallbackAddress,
    formattedAddress: result?.formatted_address,
  });
  if (!address) return null;

  const location = result?.geometry?.location;
  const lat = getLocationCoordinate(location, "lat");
  const lng = getLocationCoordinate(location, "lng");

  return {
    address,
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  };
}

export function canUseGooglePlacesAutocomplete(google: any): boolean {
  return typeof google?.maps?.places?.Autocomplete === "function";
}

export function canUseGoogleMapsCore(google: any): boolean {
  return (
    typeof google?.maps?.Map === "function" &&
    typeof google?.maps?.Geocoder === "function" &&
    typeof google?.maps?.LatLng === "function" &&
    typeof google?.maps?.event?.trigger === "function"
  );
}

export function createGoogleMapsScriptUrl(apiKey: string, callbackName: string): string {
  const params = new URLSearchParams({
    callback: callbackName,
    key: apiKey,
    libraries: "places",
    loading: "async",
  });

  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

const getGoogleMapsApiKey = () => {
  if (typeof import.meta === "undefined") return "";
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || "";
};

export function LocationSearchInput({
  id,
  value,
  onChange,
  onResolvedLocation,
  loadGoogleMapsScript = true,
  placeholder,
  className,
}: LocationSearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const selectedLatLngRef = useRef<any>(null);
  const [isMapsReady, setIsMapsReady] = useState(false);
  const [isPlacesReady, setIsPlacesReady] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const setMarkerAndCenter = useCallback((location: { lat: number; lng: number }) => {
    if (!window.google?.maps || !mapInstanceRef.current) return;

    const latLng = new window.google.maps.LatLng(location.lat, location.lng);
    selectedLatLngRef.current = latLng;
    mapInstanceRef.current.setCenter(latLng);
    mapInstanceRef.current.setZoom(15);

    if (!markerInstanceRef.current) {
      markerInstanceRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: latLng,
      });
      return;
    }

    markerInstanceRef.current.setPosition(latLng);
  }, []);

  const resolveGoogleState = useCallback(() => {
    const google = typeof window === "undefined" ? undefined : window.google;
    setIsMapsReady(canUseGoogleMapsCore(google));
    setIsPlacesReady(canUseGooglePlacesAutocomplete(google));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    resolveGoogleState();
    if (!loadGoogleMapsScript || canUseGoogleMapsCore(window.google)) return;

    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) return;

    const callbackName = "__diploLifeGoogleMapsReady";
    window.__diploLifeGoogleMapsReady = resolveGoogleState;

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-diplolife-google-maps]");
    if (existingScript) return;

    const script = document.createElement("script");
    script.async = true;
    script.dataset.diplolifeGoogleMaps = "true";
    script.src = createGoogleMapsScriptUrl(apiKey, callbackName);
    document.head.appendChild(script);
  }, [loadGoogleMapsScript, resolveGoogleState]);

  useEffect(() => {
    if (!isPlacesReady || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
    });
    autocompleteRef.current = autocomplete;
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const fallbackAddress = inputRef.current?.value || value;
      const resolved = createResolvedLocationFromGooglePlace(place, fallbackAddress);
      if (!resolved) return;

      onChange(resolved.address);
      onResolvedLocation?.(resolved);
      if (resolved.lat !== undefined && resolved.lng !== undefined) {
        setMarkerAndCenter({ lat: resolved.lat, lng: resolved.lng });
      }
      setStatusText("Location selected from Google Places.");
    });
  }, [isPlacesReady, onChange, onResolvedLocation, setMarkerAndCenter, value]);

  useEffect(() => {
    if (!showMap || !isMapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = selectedLatLngRef.current ?? { lat: 37.5665, lng: 126.978 };
    mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: initialCenter,
      mapTypeControl: false,
      streetViewControl: false,
      zoom: selectedLatLngRef.current ? 15 : 11,
    });
  }, [isMapsReady, showMap]);

  useEffect(() => {
    if (!showMap || !isMapsReady || !mapInstanceRef.current || !window.google?.maps) return;

    const timeoutId = window.setTimeout(() => {
      window.google.maps.event.trigger(mapInstanceRef.current, "resize");
      if (selectedLatLngRef.current) {
        mapInstanceRef.current.setCenter(selectedLatLngRef.current);
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isMapsReady, showMap]);

  const geocodeTypedAddress = useCallback(() => {
    const query = value.trim();
    if (!query) return;

    if (!canUseGoogleMapsCore(window.google)) {
      onResolvedLocation?.({ address: query });
      setStatusText("Saved text location. Google Maps is not available.");
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results: any[], status: string) => {
      if (status !== "OK" || !results?.[0]) {
        onResolvedLocation?.({ address: query });
        setStatusText("Saved text location. Geocoding did not return coordinates.");
        return;
      }

      const resolved = createResolvedLocationFromGeocoderResult(results[0], query);
      if (!resolved) return;

      onChange(resolved.address);
      onResolvedLocation?.(resolved);
      if (resolved.lat !== undefined && resolved.lng !== undefined) {
        setMarkerAndCenter({ lat: resolved.lat, lng: resolved.lng });
      }
      setStatusText("Coordinates resolved.");
    });
  }, [onChange, onResolvedLocation, setMarkerAndCenter, value]);

  const handleRecenter = () => {
    if (selectedLatLngRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(selectedLatLngRef.current);
      mapInstanceRef.current.setZoom(15);
    }
  };

  const mapsSearchHref = value.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`
    : "https://www.google.com/maps";

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            placeholder={placeholder || "Enter an address, station, or accommodation"}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              onResolvedLocation?.({ address: event.target.value });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                geocodeTypedAddress();
              }
            }}
            className={`min-h-11 w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm transition-shadow placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${className || ""}`}
          />
        </div>

        <button
          type="button"
          onClick={geocodeTypedAddress}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          Resolve
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMap((current) => !current)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-expanded={showMap}
          aria-controls={`${inputId}-map`}
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          {showMap ? "Hide map" : "Show map"}
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          disabled={!selectedLatLngRef.current}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Recenter
        </button>

        <a
          href={mapsSearchHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open in Google Maps
        </a>
      </div>

      {statusText && <p className="text-xs text-muted-foreground">{statusText}</p>}

      {showMap && (
        <div
          id={`${inputId}-map`}
          ref={mapContainerRef}
          className="h-64 overflow-hidden rounded-xl border border-border bg-surface-alt"
        >
          {!isMapsReady && (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Google Maps is not available. The text address will still be saved.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
