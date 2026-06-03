import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ExternalLink,
  LocateFixed,
  Map as MapIcon,
  Navigation,
  Search,
} from "lucide-react";

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
  const [isLocating, setIsLocating] = useState(false);
  const [mapStatus, setMapStatus] = useState("二쇱냼瑜?寃?됲븯硫?吏?꾩뿉 異쒕컻 湲곗??먯씠 ?쒖떆?⑸땲??");

  const hasAddress = value.trim().length > 0;

  const googleMapsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`
    : "";

  const setMarkerAndCenter = useCallback((latLng: any, zoom = 17) => {
    selectedLatLngRef.current = latLng;
    markerInstanceRef.current?.setPosition(latLng);
    mapInstanceRef.current?.setCenter(latLng);
    mapInstanceRef.current?.setZoom(zoom);
  }, []);

  const refreshGoogleMapsAvailability = useCallback(() => {
    const mapsReady = canUseGoogleMapsCore(window.google);

    setIsMapsReady(mapsReady);
    setIsPlacesReady(canUseGooglePlacesAutocomplete(window.google));

    return mapsReady;
  }, []);

  const reverseGeocode = useCallback(
    (latLng: any, successMessage: string) => {
      if (!canUseGoogleMapsCore(window.google)) {
        setMapStatus("吏??濡쒕뱶 ???ㅼ떆 ?쒕룄?섏꽭??");
        return;
      }

      setMarkerAndCenter(latLng);
      setShowMap(true);
      setMapStatus("?좏깮???꾩튂??二쇱냼瑜??뺤씤?섎뒗 以묒엯?덈떎.");

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results: any, status: string) => {
        if (status === "OK" && results?.[0]) {
          const resolved = createResolvedLocationFromGeocoderResult(results[0], value);
          if (resolved) {
            onChange(resolved.address);
            onResolvedLocation?.(resolved);
          }
          setMapStatus(successMessage);
          return;
        }

        setMapStatus("?좏깮???꾩튂??二쇱냼瑜??뺤씤?섏? 紐삵뻽?듬땲?? 寃?됱뼱瑜?吏곸젒 ?낅젰?섏꽭??");
      });
    },
    [onChange, onResolvedLocation, setMarkerAndCenter, value],
  );

  const geocodeTypedAddress = useCallback(() => {
    const query = value.trim();

    if (!query) {
      setMapStatus("二쇱냼???μ냼紐낆쓣 癒쇱? ?낅젰?섏꽭??");
      inputRef.current?.focus();
      return;
    }

    if (!canUseGoogleMapsCore(window.google)) {
      setShowMap(true);
      setMapStatus("吏??濡쒕뱶 ???ㅼ떆 ?쒕룄?섏꽭??");
      return;
    }

    setMapStatus("?낅젰???꾩튂瑜?吏?꾩뿉??李얜뒗 以묒엯?덈떎.");
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address: query }, (results: any, status: string) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const result = results[0];
        setMarkerAndCenter(result.geometry.location);
        const resolved = createResolvedLocationFromGeocoderResult(result, query);
        if (resolved) {
          onChange(resolved.address);
          onResolvedLocation?.(resolved);
        }
        setShowMap(true);
        setMapStatus("?낅젰???꾩튂瑜?吏?꾩뿉 ?쒖떆?덉뒿?덈떎.");
        return;
      }

      setMapStatus("吏?꾩뿉???대떦 ?꾩튂瑜?李얠? 紐삵뻽?듬땲?? ??援ъ껜?곸씤 二쇱냼瑜??낅젰?섏꽭??");
    });
  }, [onChange, onResolvedLocation, setMarkerAndCenter, value]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapStatus("?꾩옱 釉뚮씪?곗??먯꽌 ?꾩튂 ?뺣낫瑜??ъ슜?????놁뒿?덈떎.");
      return;
    }

    if (!canUseGoogleMapsCore(window.google)) {
      setShowMap(true);
      setMapStatus("吏??濡쒕뱶 ???ㅼ떆 ?쒕룄?섏꽭??");
      return;
    }

    setIsLocating(true);
    setMapStatus("?꾩옱 ?꾩튂瑜??뺤씤?섎뒗 以묒엯?덈떎.");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latLng = new window.google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude,
        );
        reverseGeocode(latLng, "?꾩옱 ?꾩튂瑜?異쒕컻 湲곗??먯쑝濡??ㅼ젙?덉뒿?덈떎.");
        setIsLocating(false);
      },
      () => {
        setMapStatus("?꾩옱 ?꾩튂 沅뚰븳??諛쏆쓣 ???놁뒿?덈떎. 二쇱냼瑜?吏곸젒 寃?됲븯?몄슂.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [reverseGeocode]);

  const handleRecenter = useCallback(() => {
    if (selectedLatLngRef.current) {
      setShowMap(true);
      setMarkerAndCenter(selectedLatLngRef.current);
      setMapStatus("?좏깮??湲곗??먯쑝濡?吏?꾨? ?ㅼ떆 留욎톬?듬땲??");
      return;
    }

    geocodeTypedAddress();
  }, [geocodeTypedAddress, setMarkerAndCenter]);

  useEffect(() => {
    if (refreshGoogleMapsAvailability()) {
      return;
    }

    const scriptId = "google-maps-script";
    const callbackName = "__diploLifeGoogleMapsReady";
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    let isCancelled = false;
    let checkInterval: number | undefined;
    let timeoutId: number | undefined;

    const markReady = () => {
      if (isCancelled) return;

      const mapsReady = refreshGoogleMapsAvailability();
      if (mapsReady) {
        setMapStatus("二쇱냼瑜?寃?됲븯硫?吏?꾩뿉 異쒕컻 湲곗??먯씠 ?쒖떆?⑸땲??");
        return;
      }

      setMapStatus("Google Maps ?듭떖 ?쇱씠釉뚮윭由щ? ?ъ슜?????놁뒿?덈떎.");
    };

    window[callbackName] = markReady;

    if (!loadGoogleMapsScript) {
      setMapStatus("吏?꾨? 遺덈윭?ㅻ뒗 以묒엯?덈떎.");
      checkInterval = window.setInterval(() => {
        if (refreshGoogleMapsAvailability()) {
          setMapStatus("二쇱냼瑜?寃?됲븯硫?吏?꾩뿉 異쒕컻 湲곗??먯씠 ?쒖떆?⑸땲??");
          if (checkInterval !== undefined) window.clearInterval(checkInterval);
        }
      }, 200);

      timeoutId = window.setTimeout(() => {
        if (!canUseGoogleMapsCore(window.google)) {
          setMapStatus("吏?꾨? 遺덈윭?ㅼ? 紐삵뻽?듬땲?? API ???먮뒗 ?꾨찓???쒗븳???뺤씤?섏꽭??");
        }
      }, 8000);

      return () => {
        isCancelled = true;
        if (checkInterval !== undefined) window.clearInterval(checkInterval);
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      };
    }

    if (!apiKey) {
      setMapStatus("Google Maps API ?ㅺ? ?놁뼱 二쇱냼 ?낅젰留??ъ슜?????덉뒿?덈떎.");
      return () => {
        isCancelled = true;
      };
    }

    setMapStatus("吏?꾨? 遺덈윭?ㅻ뒗 以묒엯?덈떎.");

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = createGoogleMapsScriptUrl(apiKey, callbackName);
      script.async = true;
      script.defer = true;
      script.onload = markReady;
      script.onerror = () => setMapStatus("吏?꾨? 遺덈윭?ㅼ? 紐삵뻽?듬땲?? 二쇱냼 ?낅젰? 怨꾩냽 ?ъ슜?????덉뒿?덈떎.");
      document.head.appendChild(script);
    } else {
      checkInterval = window.setInterval(() => {
        if (refreshGoogleMapsAvailability()) {
          if (checkInterval !== undefined) window.clearInterval(checkInterval);
        }
      }, 200);
    }

    timeoutId = window.setTimeout(() => {
      if (!canUseGoogleMapsCore(window.google)) {
        setMapStatus("吏?꾨? 遺덈윭?ㅼ? 紐삵뻽?듬땲?? API ???먮뒗 ?꾨찓???쒗븳???뺤씤?섏꽭??");
      }
    }, 8000);

    return () => {
      isCancelled = true;
      if (checkInterval !== undefined) window.clearInterval(checkInterval);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [loadGoogleMapsScript, refreshGoogleMapsAvailability]);

  useEffect(() => {
    if (isPlacesReady && inputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "name", "geometry"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (place && place.geometry && place.geometry.location) {
          if (mapInstanceRef.current) {
            if (place.geometry.viewport) {
              mapInstanceRef.current.fitBounds(place.geometry.viewport);
            } else {
              mapInstanceRef.current.setCenter(place.geometry.location);
              mapInstanceRef.current.setZoom(17);
            }
            markerInstanceRef.current?.setPosition(place.geometry.location);
            selectedLatLngRef.current = place.geometry.location;
            setShowMap(true);
          }

          const fallbackAddress = inputRef.current?.value ?? value;
          const resolved = createResolvedLocationFromGooglePlace(place, fallbackAddress);
          if (resolved) {
            onChange(resolved.address);
            onResolvedLocation?.(resolved);
          }
          setMapStatus("?좏깮???μ냼瑜?異쒕컻 湲곗??먯쑝濡??ㅼ젙?덉뒿?덈떎.");
        } else if (inputRef.current) {
          onChange(inputRef.current.value);
        }
      });
    }
  }, [isPlacesReady, onChange, onResolvedLocation, value]);

  useEffect(() => {
    if (!showMap || !isMapsReady || !mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 37.5665, lng: 126.978 },
      clickableIcons: false,
      fullscreenControl: false,
      gestureHandling: "cooperative",
      mapTypeControl: false,
      streetViewControl: false,
      zoom: 11,
      zoomControl: true,
    });

    if (typeof window.google.maps.Marker === "function") {
      markerInstanceRef.current = new window.google.maps.Marker({
        draggable: true,
        map: mapInstanceRef.current,
      });

      markerInstanceRef.current.addListener("dragend", (e: any) => {
        reverseGeocode(e.latLng, "?????릿 ?꾩튂瑜?異쒕컻 湲곗??먯쑝濡??ㅼ젙?덉뒿?덈떎.");
      });
    }

    mapInstanceRef.current.addListener("click", (e: any) => {
      reverseGeocode(e.latLng, "吏?꾩뿉???좏깮???꾩튂瑜?異쒕컻 湲곗??먯쑝濡??ㅼ젙?덉뒿?덈떎.");
    });

    if (selectedLatLngRef.current) {
      setMarkerAndCenter(selectedLatLngRef.current);
    }
  }, [isMapsReady, reverseGeocode, setMarkerAndCenter, showMap]);

  useEffect(() => {
    if (!showMap || !isMapsReady || !mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.google.maps.event.trigger(mapInstanceRef.current, "resize");
      if (selectedLatLngRef.current) {
        mapInstanceRef.current.setCenter(selectedLatLngRef.current);
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isMapsReady, showMap]);

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
            placeholder={placeholder || "?숇컯 ?꾩튂瑜??낅젰?섏꽭??}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onResolvedLocation?.({ address: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
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
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          吏?꾩뿉??李얘린
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
          {showMap ? "吏???묎린" : "吏???닿린"}
        </button>

        <button
          type="button"
          onClick={handleRecenter}
