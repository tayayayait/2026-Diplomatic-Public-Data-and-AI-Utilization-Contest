import { describe, expect, it } from "vitest";
import { computeRoute } from "./google-routes-api";

describe("computeRoute ??TRANSIT fallback", () => {
  it("TRANSIT API ?ㅽ뙣 ??吏곸꽑嫄곕━ 湲곕컲 異붿젙媛믪쓣 諛섑솚?쒕떎", async () => {
    // fetcher媛 500 ?먮윭瑜?諛섑솚?섎룄濡?mock
    const failFetcher = () => Promise.resolve(new Response("", { status: 500 }));
    
    // ?섏뭅???    const origin = { lat: 33.5902, lng: 130.4017 };
    // ?먯쭊
    const dest = { lat: 33.5563, lng: 130.3854 };

    const result = await computeRoute(origin, dest, {
      fetcher: failFetcher,
      googleApiKey: "test-key",
      travelMode: "TRANSIT",
    });

    // 異붿젙媛믪씠 0???꾨땲?댁빞 ??    expect(result.durationMinutes).toBeGreaterThan(0);
    expect(result.distanceMeters).toBeGreaterThan(0);
  });

  it("TRANSIT API媛 200 OK瑜?諛섑솚?섏?留?routes媛 鍮꾩뼱?덉쓣 ?뚮룄 異붿젙媛믪쓣 諛섑솚?쒕떎", async () => {
    // 200 OK?댁?留?寃쎈줈瑜?李얠? 紐삵븳 寃쎌슦
    const emptyRoutesFetcher = () => 
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    
    const origin = { lat: 33.59, lng: 130.40 };
    const dest = { lat: 33.55, lng: 130.38 };

    const result = await computeRoute(origin, dest, {
      fetcher: emptyRoutesFetcher,
      googleApiKey: "test-key",
      travelMode: "TRANSIT",
    });

    expect(result.durationMinutes).toBeGreaterThan(0);
    expect(result.distanceMeters).toBeGreaterThan(0);
  });

  it("WALK API ?ㅽ뙣 ?쒖뿉??湲곗〈?濡?{0, 0}??諛섑솚?쒕떎", async () => {
    const failFetcher = () => Promise.resolve(new Response("", { status: 500 }));
    const origin = { lat: 33.59, lng: 130.40 };
    const dest = { lat: 33.55, lng: 130.38 };

    const result = await computeRoute(origin, dest, {
      fetcher: failFetcher,
      googleApiKey: "test-key",
      travelMode: "WALK",
    });

    expect(result.durationMinutes).toBe(0);
    expect(result.distanceMeters).toBe(0);
  });
});
