import { describe, expect, it, vi } from "vitest";
import { buildGeocodingUrl, fetchDestinationWeather } from "./weather";
import type { Destination } from "./types";

const kyotoDestination: Destination = {
  id: "dest_kyoto",
  tripId: "trip_1",
  countryIsoAlp2: "JP",
  countryNm: "?쇰낯",
  cities: ["援먰넗"],
  arrivalDate: "2026-05-30",
  departureDate: "2026-05-31",
};

describe("Open-Meteo weather integration", () => {
  it("uses API-searchable city aliases for Korean city names", () => {
    const url = new URL(buildGeocodingUrl(kyotoDestination));

    expect(url.searchParams.get("name")).toBe("Kyoto");
    expect(url.searchParams.get("countryCode")).toBe("JP");
  });

  it("returns a forecast for a Korean display city when its Open-Meteo alias exists", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://geocoding-api.open-meteo.com")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                name: "援먰넗 ??",
                latitude: 35.02107,
                longitude: 135.75385,
                country_code: "JP",
                timezone: "Asia/Tokyo",
              },
            ],
          }),
        );
      }

      return new Response(
        JSON.stringify({
          latitude: 35.0,
          longitude: 135.75,
          timezone: "Asia/Tokyo",
          daily: {
            time: ["2026-05-30", "2026-05-31"],
            weather_code: [61, 2],
            temperature_2m_max: [24.2, 26.1],
            temperature_2m_min: [16.5, 18.0],
            precipitation_sum: [8.4, 0],
            precipitation_probability_max: [70, 10],
            wind_speed_10m_max: [12.3, 7.8],
            uv_index_max: [4.1, 7.2],
          },
        }),
      );
    }) as unknown as typeof fetch;

    const forecast = await fetchDestinationWeather({
      destination: kyotoDestination,
      fetcher,
      now: () => "2026-05-30T00:00:00.000Z",
    });

    const geocodingUrl = new URL(String(vi.mocked(fetcher).mock.calls[0][0]));

    expect(geocodingUrl.searchParams.get("name")).toBe("Kyoto");
    expect(forecast.status).toBe("success");
    expect(forecast.city).toBe("援먰넗");
    expect(forecast.days).toHaveLength(2);
    expect(forecast.days[0]).toMatchObject({
      date: "2026-05-30",
      precipitationProbabilityMax: 70,
      weatherLabel: "鍮?",
    });
  });
});
