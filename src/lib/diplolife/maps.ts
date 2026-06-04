export interface GoogleMapsPlaceTarget {
  name: string;
  address?: string;
  googleMapsUri?: string;
  googleMapsUrl?: string;
  googlePlaceId?: string;
}

const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "maps.app.goo.gl",
  "maps.google.com",
  "www.google.com",
]);

function normalizeText(value?: string): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function getTrustedGoogleMapsUrl(place: GoogleMapsPlaceTarget): string | null {
  const rawUrl = normalizeText(place.googleMapsUri || place.googleMapsUrl);

  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "https:" || !GOOGLE_MAPS_HOSTS.has(url.hostname)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function buildGoogleMapsPlaceUrl(place: GoogleMapsPlaceTarget): string {
  const trustedUrl = getTrustedGoogleMapsUrl(place);

  if (trustedUrl) {
    return trustedUrl;
  }

  const query = [place.name, place.address]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams({
    api: "1",
    query: query || normalizeText(place.name),
  });
  const placeId = normalizeText(place.googlePlaceId);

  if (placeId) {
    params.set("query_place_id", placeId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}
