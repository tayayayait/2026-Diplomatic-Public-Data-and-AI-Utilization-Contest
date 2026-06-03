import type { ItineraryPlace } from "@/lib/gemini/schema";

const aliasPairs: Array<[string, string]> = [
  ["후쿠오카", " fukuoka "],
  ["하카타", " hakata "],
  ["나카스", " nakasu "],
  ["텐진", " tenjin "],
  ["오호리", " ohori "],
  ["다자이후", " dazaifu "],
  ["모모치", " momochi "],
  ["캐널시티", " canal city "],
  ["구시다", " kushida "],
  ["포장마차", " food stalls "],
  ["야타이", " food stalls "],
  ["거리", " street "],
  ["공원", " park "],
  ["해변", " beach "],
  ["신사", " shrine "],
  ["사원", " temple "],
  ["타워", " tower "],
  ["박물관", " museum "],
  ["미술관", " art museum "],
  ["시장", " market "],
  ["라멘", " ramen "],
  ["모츠나베", " motsunabe "],
  ["명란", " mentaiko "],
  ["멘타이코", " mentaiko "],
  ["우동", " udon "],
  ["야키토리", " yakitori "],
  ["스시", " sushi "],
  ["카페", " cafe "],
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "city",
  "fukuoka",
  "in",
  "japan",
  "jp",
  "of",
  "the",
]);

export const normalizePlaceIdentifier = (value: string) => value.trim().toLowerCase();

export const normalizePlaceNameForDeduplication = (value: string) => {
  let normalized = value.normalize("NFC").toLowerCase();

  for (const [alias, replacement] of aliasPairs) {
    normalized = normalized.replaceAll(alias, replacement);
  }

  return normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
};

const tokenizePlaceName = (value: string) =>
  normalizePlaceNameForDeduplication(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stopWords.has(token));

export const isSimilarPlaceName = (leftName: string, rightName: string) => {
  const left = normalizePlaceNameForDeduplication(leftName);
  const right = normalizePlaceNameForDeduplication(rightName);

  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 6 && right.length >= 6 && (left.includes(right) || right.includes(left))) {
    return true;
  }

  const leftTokens = new Set(tokenizePlaceName(left));
  const rightTokens = new Set(tokenizePlaceName(right));
  const smallerSize = Math.min(leftTokens.size, rightTokens.size);
  if (smallerSize < 2) return false;

  const sharedCount = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return sharedCount >= smallerSize || sharedCount / Math.max(leftTokens.size, rightTokens.size) >= 0.6;
};

export const collectItineraryPlaceExclusions = (places: ItineraryPlace[]) => {
  const excludedGooglePlaceIds = new Set<string>();
  const excludedPlaceNames = new Set<string>();

  for (const place of places) {
    if (place.googlePlaceId?.trim()) {
      excludedGooglePlaceIds.add(place.googlePlaceId.trim());
    }

    for (const name of [place.placeName, place.koName]) {
      if (name?.trim()) {
        excludedPlaceNames.add(name.trim());
      }
    }
  }

  return {
    excludedGooglePlaceIds: [...excludedGooglePlaceIds],
    excludedPlaceNames: [...excludedPlaceNames],
  };
};
