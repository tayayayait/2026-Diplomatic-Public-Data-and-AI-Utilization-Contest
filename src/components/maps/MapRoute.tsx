import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface MapRouteProps {
  path: { lat: number; lng: number }[];
  color?: string;
  dashed?: boolean;
  opacity?: number;
  weight?: number;
  zIndex?: number;
}

export function MapRoute({
  path,
  color = "#2563eb",
  dashed = true,
  opacity = 0.9,
  weight = 4,
  zIndex = 1,
}: MapRouteProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const lineSymbol = {
      path: "M 0,-1 0,1",
      strokeOpacity: 1,
      scale: 3,
    };

    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: dashed ? 0 : opacity,
      strokeWeight: weight,
      icons: dashed
        ? [
            {
              icon: lineSymbol,
              offset: "0",
              repeat: "15px",
            },
          ]
        : undefined,
      zIndex,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, dashed, opacity, weight, zIndex]);

  return null;
}
