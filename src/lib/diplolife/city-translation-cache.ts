export interface TranslatedCity {
  en: string;
  ko: string;
}

const CACHE_KEY = "diplolife_city_translations";

export function getCachedTranslations(country: string): TranslatedCity[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cache = JSON.parse(raw);
    return cache[country] || null;
  } catch (error) {
    console.error("Failed to read city translations from cache:", error);
    return null;
  }
}

export function setCachedTranslations(country: string, translations: TranslatedCity[]) {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};

    cache[country] = translations;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to save city translations to cache:", error);
  }
}
