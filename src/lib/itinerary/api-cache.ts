/**
 * TTL 기반 인메모리 캐시 유틸리티.
 * 동일 세션 내 반복되는 Google Places / Routes API 호출을 제거합니다.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5분

interface CacheEntry<V> {
  expiresAt: number;
  value: V;
}

export class CacheTTLMap<V> {
  private readonly store = new Map<string, CacheEntry<V>>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { expiresAt: Date.now() + this.ttlMs, value });
  }

  /** 만료된 엔트리를 일괄 정리합니다. */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

/** Google Places API 검색 결과 캐시 (모듈 레벨 싱글턴) */
export const placesSearchCache = new CacheTTLMap<unknown[]>();

/** Google Routes API 경로 계산 결과 캐시 (모듈 레벨 싱글턴) */
export const routeCache = new CacheTTLMap<{ distanceMeters: number; durationMinutes: number }>();

/**
 * 좌표를 소수점 5자리로 반올림하여 캐시 키를 생성합니다.
 * 소수점 5자리 ≈ 약 1.1m 정밀도로 동일한 좌표에 대한 캐시 히트율을 높입니다.
 */
export const createRoutesCacheKey = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelMode: string,
) =>
  `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}|${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}|${travelMode}`;
