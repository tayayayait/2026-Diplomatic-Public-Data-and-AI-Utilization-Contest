import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

import type { MapRouteSegment } from "@/lib/itinerary/map-route-view-model";

interface MapDirectionsRouteProps {
  color?: string;
  opacity?: number;
  segments: MapRouteSegment[];
  weight?: number;
  zIndex?: number;
}

const getGoogleTravelMode = (
  maps: typeof google.maps,
  mode: MapRouteSegment["travelMode"],
) => {
  if (mode === "DRIVE") return maps.TravelMode.DRIVING;
  if (mode === "TRANSIT") return maps.TravelMode.TRANSIT;
  if (mode === "BICYCLE") return maps.TravelMode.BICYCLING;

  return maps.TravelMode.WALKING;
};

export function MapDirectionsRoute({
  color = "#2563eb",
  opacity = 0.9,
  segments,
  weight = 4,
  zIndex = 2,
}: MapDirectionsRouteProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google?.maps || segments.length === 0) return;

    let isCancelled = false;
    const maps = window.google.maps;
    const service = new maps.DirectionsService();
    const renderers: google.maps.DirectionsRenderer[] = [];

    for (const segment of segments) {
      service.route(
        {
          destination: segment.destination,
          origin: segment.origin,
          travelMode: getGoogleTravelMode(maps, segment.travelMode),
        },
        (result, status) => {
          if (isCancelled || status !== "OK" || !result) return;

          const renderer = new maps.DirectionsRenderer({
            directions: result,
            map,
            preserveViewport: true,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: color,
              strokeOpacity: opacity,
              strokeWeight: weight,
              zIndex,
            },
          });

          renderers.push(renderer);
        },
      );
    }

    return () => {
      isCancelled = true;
      renderers.forEach((renderer) => renderer.setMap(null));
    };
  }, [color, map, opacity, segments, weight, zIndex]);

  return null;
}
