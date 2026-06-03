import {
  DAILY_ITINERARY_CATEGORY_TARGETS,
  RECOMMENDATION_SCORE_WEIGHTS,
  getRadiusPolicyForTravelModes,
  getRecommendationCategoryGroup,
  selectTargetPlaceCount,
  type LocalItineraryRecommendationRequest,
  type RecommendationCategoryGroup,
} from "./recommendation-policy";
import type { GooglePlaceCandidate } from "./google-place-candidates";
import {
  resolveEffectiveItineraryBudgetStrategy,
  type BudgetStrategy,
} from "./budget-plan";
import { isSimilarPlaceName } from "./place-deduplication";

type ScoreWeights = Record<keyof typeof RECOMMENDATION_SCORE_WEIGHTS, number>;

export interface ScoredCandidate extends GooglePlaceCandidate {
  distanceMetersFromDeparture: number;
  score: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const foodPriceEstimateKrwByLevel: Partial<Record<NonNullable<GooglePlaceCandidate["priceLevel"]>, number>> = {
  PRICE_LEVEL_EXPENSIVE: 70000,
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 15000,
  PRICE_LEVEL_MODERATE: 30000,
  PRICE_LEVEL_VERY_EXPENSIVE: 120000,
};

const activityPriceEstimateKrwByLevel: Partial<Record<NonNullable<GooglePlaceCandidate["priceLevel"]>, number>> = {
  PRICE_LEVEL_EXPENSIVE: 60000,
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 10000,
  PRICE_LEVEL_MODERATE: 25000,
  PRICE_LEVEL_VERY_EXPENSIVE: 100000,
};

const budgetShareByCategory: Record<RecommendationCategoryGroup, number> = {
  attraction: 0.2,
  cafe: 0.3,
  meal: 0.3,
  other: 0.2,
  shoppingOrExperience: 0.2,
};

export const haversineMeters = (
  left: { lat: number; lng: number },
  right: { lat: number; lng: number },
) => {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRadians(right.lat - left.lat);
  const dLng = toRadians(right.lng - left.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(left.lat)) *
      Math.cos(toRadians(right.lat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const scoreCandidate = (
  candidate: GooglePlaceCandidate,
  request: LocalItineraryRecommendationRequest,
): ScoredCandidate => {
  const budgetStrategy = resolveEffectiveItineraryBudgetStrategy(request.budgetPlan);
  const weights = getScoreWeightsForBudgetStrategy(budgetStrategy);
  const distanceMetersFromDeparture = haversineMeters(
    request.departure as { lat: number; lng: number },
    candidate.location,
  );
  const distanceReferenceMeters = Math.max(
    request.searchRadiusMeters,
    getRadiusPolicyForTravelModes(request.travelModes).hardCap,
  );
  const distanceRatio = Math.min(distanceMetersFromDeparture / distanceReferenceMeters, 1);
  const popularityScore =
    ((candidate.rating ?? 0) / 5) * 0.65 +
    Math.min((candidate.userRatingCount ?? 0) / 1000, 1) * 0.35;
  const openingScore = candidate.openingNow === false ? 0 : 1;
  const budgetScore = getBudgetFitScore(candidate, request, budgetStrategy);
  const weightedScore =
    (1 - distanceRatio) * weights.routeEfficiency +
    popularityScore * weights.googlePopularity +
    openingScore * weights.openingHoursFit +
    budgetScore * weights.budgetFit +
    weights.categoryDiversity;

  return {
    ...candidate,
    distanceMetersFromDeparture,
    score: Math.round(weightedScore * 10) / 10,
  };
};

const isUsableCandidate = (candidate: GooglePlaceCandidate) =>
  candidate.businessStatus !== "CLOSED_PERMANENTLY" &&
  candidate.businessStatus !== "CLOSED_TEMPORARILY";

const scoreWeightsByBudgetStrategy: Record<BudgetStrategy, ScoreWeights> = {
  balanced: RECOMMENDATION_SCORE_WEIGHTS,
  experience: {
    budgetFit: 5,
    categoryDiversity: 5,
    googlePopularity: 50,
    openingHoursFit: 10,
    routeEfficiency: 30,
  },
  saving: {
    budgetFit: 10,
    categoryDiversity: 5,
    googlePopularity: 40,
    openingHoursFit: 10,
    routeEfficiency: 35,
  },
};

const getScoreWeightsForBudgetStrategy = (strategy: BudgetStrategy) =>
  scoreWeightsByBudgetStrategy[strategy];

const getStrategyPriceLevelScore = (
  priceLevel: GooglePlaceCandidate["priceLevel"],
  strategy: BudgetStrategy,
) => {
  if (strategy === "saving") {
    if (priceLevel === "PRICE_LEVEL_FREE" || priceLevel === "PRICE_LEVEL_INEXPENSIVE") return 1;
    if (priceLevel === "PRICE_LEVEL_MODERATE") return 0.65;
    if (!priceLevel) return 0.45;
    return 0;
  }

  if (strategy === "experience") {
    if (priceLevel === "PRICE_LEVEL_EXPENSIVE" || priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") return 1;
    if (priceLevel === "PRICE_LEVEL_MODERATE") return 0.9;
    if (priceLevel === "PRICE_LEVEL_FREE" || priceLevel === "PRICE_LEVEL_INEXPENSIVE") return 0.75;
    return 0.7;
  }

  if (priceLevel === "PRICE_LEVEL_FREE" || priceLevel === "PRICE_LEVEL_INEXPENSIVE") return 1;
  if (priceLevel === "PRICE_LEVEL_MODERATE") return 1;
  if (priceLevel === "PRICE_LEVEL_EXPENSIVE") return 0.4;
  if (priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") return 0.2;
  return 0.6;
};

const getEstimatedPriceKrw = (
  candidate: GooglePlaceCandidate,
  category: RecommendationCategoryGroup,
) => {
  if (!candidate.priceLevel) return undefined;

  if (category === "meal" || category === "cafe") {
    return foodPriceEstimateKrwByLevel[candidate.priceLevel];
  }

  if (category === "attraction" || category === "shoppingOrExperience") {
    return activityPriceEstimateKrwByLevel[candidate.priceLevel];
  }

  return undefined;
};

const getCategoryBudgetKrw = (
  request: LocalItineraryRecommendationRequest,
  category: RecommendationCategoryGroup,
) => {
  const budgetPlan = request.budgetPlan;
  if (!budgetPlan) return undefined;

  const localBudget =
    category === "meal" || category === "cafe"
      ? budgetPlan.dailyLocalBudget?.food
      : budgetPlan.dailyLocalBudget?.activity;
  if (
    typeof localBudget === "number" &&
    Number.isFinite(localBudget) &&
    typeof budgetPlan.exchangeRateKrwPerLocal === "number" &&
    Number.isFinite(budgetPlan.exchangeRateKrwPerLocal) &&
    budgetPlan.exchangeRateKrwPerLocal > 0
  ) {
    return localBudget * budgetPlan.exchangeRateKrwPerLocal;
  }

  if (
    typeof budgetPlan.dailyBudgetKrw === "number" &&
    Number.isFinite(budgetPlan.dailyBudgetKrw) &&
    budgetPlan.dailyBudgetKrw > 0
  ) {
    return budgetPlan.dailyBudgetKrw * budgetShareByCategory[category];
  }

  return undefined;
};

const getBudgetAmountFitScore = (
  candidate: GooglePlaceCandidate,
  request: LocalItineraryRecommendationRequest,
) => {
  const category = getRecommendationCategoryGroup(candidate);
  const estimatedPriceKrw = getEstimatedPriceKrw(candidate, category);
  const categoryBudgetKrw = getCategoryBudgetKrw(request, category);
  if (estimatedPriceKrw === undefined || categoryBudgetKrw === undefined) return undefined;
  if (estimatedPriceKrw <= 0) return 1;

  const ratio = estimatedPriceKrw / Math.max(categoryBudgetKrw, 1);
  if (ratio <= 1) return 1;
  if (ratio <= 1.5) return 0.9;
  if (ratio <= 2.5) return 0.75;
  return 0.55;
};

const getBudgetFitScore = (
  candidate: GooglePlaceCandidate,
  request: LocalItineraryRecommendationRequest,
  strategy: BudgetStrategy,
) => {
  const amountScore = getBudgetAmountFitScore(candidate, request);
  if (amountScore !== undefined) return amountScore;

  return getStrategyPriceLevelScore(candidate.priceLevel, strategy);
};



const requiredCategoryOrder: RecommendationCategoryGroup[] = ["meal", "attraction", "cafe"];
const morningFlowOrder: RecommendationCategoryGroup[] = [
  "attraction",
  "meal",
  "attraction",
  "cafe",
  "shoppingOrExperience",
  "meal",
  "other",
];
const lunchStartFlowOrder: RecommendationCategoryGroup[] = [
  "meal",
  "attraction",
  "cafe",
  "shoppingOrExperience",
  "meal",
  "attraction",
  "other",
];
const eveningStartFlowOrder: RecommendationCategoryGroup[] = [
  "meal",
  "shoppingOrExperience",
  "attraction",
  "cafe",
  "other",
];

const getCandidateKey = (candidate: ScoredCandidate) =>
  candidate.id ?? `${candidate.name}|${candidate.location.lat}|${candidate.location.lng}`;

const mealDiversityPatterns: Array<{ key: string; values: string[] }> = [
  { key: "ramen", values: ["ramen", "라멘", "ラーメン", "拉麺"] },
  { key: "motsunabe", values: ["motsunabe", "모츠나베", "もつ鍋"] },
  { key: "mentaiko", values: ["mentaiko", "멘타이코", "명란"] },
  { key: "udon", values: ["udon", "우동", "うどん"] },
  { key: "yakitori", values: ["yakitori", "야키토리", "焼き鳥", "焼鳥"] },
  { key: "sushi", values: ["sushi", "스시", "寿司"] },
  { key: "cafe", values: ["cafe", "coffee", "카페", "커피"] },
];

const inferMealDiversityKey = (candidate: ScoredCandidate) => {
  if (getRecommendationCategoryGroup(candidate) !== "meal") return null;

  const searchableText = [
    candidate.name,
    candidate.primaryType,
    candidate.sourceTheme,
    ...candidate.searchIntent.searchQueries,
  ]
    .join(" ")
    .toLowerCase();

  return (
    mealDiversityPatterns.find(({ values }) =>
      values.some((value) => searchableText.includes(value.toLowerCase())),
    )?.key ?? null
  );
};

const getFlowOrderForStartTime = (startTime: string) => {
  const [hour = 9] = startTime.split(":").map(Number);
  if (hour >= 17) return eveningStartFlowOrder;
  if (hour >= 11) return lunchStartFlowOrder;
  return morningFlowOrder;
};

const takeBestRouteCandidate = (
  candidates: ScoredCandidate[],
  current: { lat: number; lng: number },
  category?: RecommendationCategoryGroup,
) => {
  const candidateIndex = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) =>
      category ? getRecommendationCategoryGroup(candidate) === category : true,
    )
    .sort((left, right) => {
      const leftDistance = haversineMeters(current, left.candidate.location);
      const rightDistance = haversineMeters(current, right.candidate.location);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return right.candidate.score - left.candidate.score;
    })[0]?.index;

  if (candidateIndex === undefined) return null;

  const [candidate] = candidates.splice(candidateIndex, 1);
  return candidate;
};

export const orderByDailyFlow = (
  request: LocalItineraryRecommendationRequest,
  candidates: ScoredCandidate[],
) => {
  const remaining = [...candidates];
  const ordered: ScoredCandidate[] = [];
  let current = request.departure as { lat: number; lng: number };

  for (const category of getFlowOrderForStartTime(request.startTime)) {
    const next = takeBestRouteCandidate(remaining, current, category);
    if (!next) continue;

    ordered.push(next);
    current = next.location;
  }

  while (remaining.length > 0) {
    const next = takeBestRouteCandidate(remaining, current);
    if (!next) break;

    ordered.push(next);
    current = next.location;
  }

  return ordered;
};

const selectBalancedCandidates = (
  request: LocalItineraryRecommendationRequest,
  candidates: ScoredCandidate[],
) => {
  const targetCount = selectTargetPlaceCount(request.durationMinutes);
  const selected: ScoredCandidate[] = [];
  const selectedKeys = new Set<string>();
  const selectedMealDiversityKeys = new Set<string>();
  const categoryCounts = new Map<RecommendationCategoryGroup, number>();

  const getCategoryCount = (category: RecommendationCategoryGroup) =>
    categoryCounts.get(category) ?? 0;

  const hasUnselectedAlternativeMeal = (mealDiversityKey: string, currentKey: string) =>
    candidates.some((candidate) => {
      const candidateKey = getCandidateKey(candidate);
      if (candidateKey === currentKey || selectedKeys.has(candidateKey)) return false;
      if (getRecommendationCategoryGroup(candidate) !== "meal") return false;

      const nextMealDiversityKey = inferMealDiversityKey(candidate);
      return Boolean(nextMealDiversityKey && nextMealDiversityKey !== mealDiversityKey);
    });

  const addCandidate = (candidate: ScoredCandidate) => {
    const key = getCandidateKey(candidate);
    if (selectedKeys.has(key)) return false;
    if (selected.some((s) => isSimilarPlaceName(s.name, candidate.name))) return false;

    const category = getRecommendationCategoryGroup(candidate);
    const target = DAILY_ITINERARY_CATEGORY_TARGETS[category];
    if (getCategoryCount(category) >= target.max) return false;

    const mealDiversityKey = inferMealDiversityKey(candidate);
    if (
      mealDiversityKey &&
      selectedMealDiversityKeys.has(mealDiversityKey) &&
      hasUnselectedAlternativeMeal(mealDiversityKey, key)
    ) {
      return false;
    }

    selected.push(candidate);
    selectedKeys.add(key);
    if (mealDiversityKey) {
      selectedMealDiversityKeys.add(mealDiversityKey);
    }
    categoryCounts.set(category, getCategoryCount(category) + 1);
    return true;
  };

  const addCategoryMinimum = (category: RecommendationCategoryGroup) => {
    const target = DAILY_ITINERARY_CATEGORY_TARGETS[category];
    for (const candidate of candidates) {
      if (selected.length >= targetCount || getCategoryCount(category) >= target.min) break;
      if (getRecommendationCategoryGroup(candidate) !== category) continue;
      addCandidate(candidate);
    }
  };

  const addThemeRepresentative = (theme: string) => {
    if (selected.length >= targetCount) return;
    if (selected.some((candidate) => candidate.sourceTheme === theme)) return;

    for (const candidate of candidates) {
      if (candidate.sourceTheme !== theme) continue;
      if (addCandidate(candidate)) break;
    }
  };

  for (const category of requiredCategoryOrder) {
    addCategoryMinimum(category);
  }



  for (const candidate of candidates) {
    if (selected.length >= targetCount) break;
    addCandidate(candidate);
  }

  return selected;
};

export const orderByNearestNeighbor = (
  request: LocalItineraryRecommendationRequest,
  candidates: ScoredCandidate[],
) => {
  const remaining = [...candidates];
  const ordered: ScoredCandidate[] = [];
  let current = request.departure as { lat: number; lng: number };

  while (remaining.length > 0) {
    remaining.sort(
      (left, right) =>
        haversineMeters(current, left.location) - haversineMeters(current, right.location),
    );
    const [next] = remaining.splice(0, 1);
    ordered.push(next);
    current = next.location;
  }

  return ordered;
};

export const selectGoogleFirstCandidates = (
  request: LocalItineraryRecommendationRequest,
  candidates: GooglePlaceCandidate[],
) =>
  orderByDailyFlow(
    request,
    selectBalancedCandidates(
      request,
      candidates
        .filter(isUsableCandidate)
        .map((candidate) => scoreCandidate(candidate, request))
        .sort((left, right) => right.score - left.score),
    ),
  );
