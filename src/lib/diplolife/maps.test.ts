import { describe, expect, it } from "vitest";
import { buildGoogleMapsPlaceUrl } from "./maps";

describe("buildGoogleMapsPlaceUrl", () => {
  it("uses a trusted Google Maps URL when the itinerary includes one", () => {
    const url = buildGoogleMapsPlaceUrl({
      name: "Monmouth Coffee Company",
      googleMapsUri: "https://www.google.com/maps/place/Monmouth+Coffee+Company",
    });

    expect(url).toBe("https://www.google.com/maps/place/Monmouth+Coffee+Company");
  });

  it("combines place name and address so Maps opens the specific place instead of a broad search", () => {
    const url = buildGoogleMapsPlaceUrl({
      name: "Monmouth Coffee Company",
      address: "27 Monmouth St, London WC2H 9EU, United Kingdom",
    });
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://www.google.com");
    expect(parsed.pathname).toBe("/maps/search/");
    expect(parsed.searchParams.get("api")).toBe("1");
    expect(parsed.searchParams.get("query")).toBe(
      "Monmouth Coffee Company 27 Monmouth St, London WC2H 9EU, United Kingdom",
    );
  });

  it("adds a place ID when available for exact Google Maps resolution", () => {
    const url = buildGoogleMapsPlaceUrl({
      name: "Borough Market",
      address: "8 Southwark St, London SE1 1TL, United Kingdom",
      googlePlaceId: "ChIJb7Y0y0cDdkgRydPAEIUqvaA",
    });
    const parsed = new URL(url);

    expect(parsed.searchParams.get("query")).toBe(
      "Borough Market 8 Southwark St, London SE1 1TL, United Kingdom",
    );
    expect(parsed.searchParams.get("query_place_id")).toBe("ChIJb7Y0y0cDdkgRydPAEIUqvaA");
  });

  it("ignores non-Google URLs from generated itinerary data", () => {
    const url = buildGoogleMapsPlaceUrl({
      name: "Borough Market",
      googleMapsUrl: "https://example.com/not-google-maps",
    });
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://www.google.com");
    expect(parsed.searchParams.get("query")).toBe("Borough Market");
  });
});
