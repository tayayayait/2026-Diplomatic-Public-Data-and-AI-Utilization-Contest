import { describe, expect, it } from "vitest";
import {
  canUseGoogleMapsCore,
  canUseGooglePlacesAutocomplete,
  createResolvedLocationFromGeocoderResult,
  createResolvedLocationFromGooglePlace,
  createGoogleMapsScriptUrl,
} from "./LocationSearchInput";

describe("LocationSearchInput Google Maps guards", () => {
  it("accepts core Google Maps without Places Autocomplete for map and geocoder usage", () => {
    expect(
      canUseGoogleMapsCore({
        maps: {
          Geocoder: function Geocoder() {},
          LatLng: function LatLng() {},
          Map: function Map() {},
          event: { trigger: function trigger() {} },
        },
      }),
    ).toBe(true);
  });

  it("rejects partially loaded Google Maps objects without Places Autocomplete", () => {
    expect(canUseGooglePlacesAutocomplete({ maps: {} })).toBe(false);
    expect(canUseGooglePlacesAutocomplete({ maps: { places: {} } })).toBe(false);
  });

  it("accepts Google Maps only when Places Autocomplete is available", () => {
    expect(
      canUseGooglePlacesAutocomplete({
        maps: { places: { Autocomplete: function Autocomplete() {} } },
      }),
    ).toBe(true);
  });

  it("loads Google Maps through an explicit callback and Places library", () => {
    const url = new URL(createGoogleMapsScriptUrl("test-key", "__mapsReady"));

    expect(url.searchParams.get("key")).toBe("test-key");
    expect(url.searchParams.get("libraries")).toBe("places");
    expect(url.searchParams.get("callback")).toBe("__mapsReady");
    expect(url.searchParams.get("loading")).toBe("async");
  });

  it("extracts address and coordinates from a Google Places autocomplete result", () => {
    const result = createResolvedLocationFromGooglePlace(
      {
        formatted_address: "221B Baker Street, London",
        geometry: {
          location: {
            lat: () => 51.5237,
            lng: () => -0.1585,
          },
        },
        name: "Sherlock Holmes Museum",
      },
      "Baker Street",
    );

    expect(result).toEqual({
      address: "Sherlock Holmes Museum, 221B Baker Street, London",
      lat: 51.5237,
      lng: -0.1585,
    });
  });

  it("extracts address and coordinates from a geocoder result", () => {
    const result = createResolvedLocationFromGeocoderResult(
      {
        formatted_address: "Watanabedori, Fukuoka",
        geometry: {
          location: {
            lat: () => 33.5868,
            lng: () => 130.4017,
          },
        },
      },
      "Watanabedori",
    );

    expect(result).toEqual({
      address: "Watanabedori, Fukuoka",
      lat: 33.5868,
      lng: 130.4017,
    });
  });
});
