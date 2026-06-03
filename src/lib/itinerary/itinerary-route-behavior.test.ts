import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("../..", import.meta.url));
const itineraryRoutePath = join(srcDir, "routes", "itinerary.tsx");
const onboardingRoutePath = join(srcDir, "routes", "onboarding.tsx");
const itineraryWorkspacePath = join(srcDir, "components", "itinerary", "ItineraryWorkspace.tsx");
const googleMapItineraryPath = join(srcDir, "components", "maps", "GoogleMapItinerary.tsx");
const source = () => readFileSync(itineraryRoutePath, "utf8");
const onboardingSource = () => readFileSync(onboardingRoutePath, "utf8");
const workspaceSource = () => readFileSync(itineraryWorkspacePath, "utf8");
const mapSource = () => readFileSync(googleMapItineraryPath, "utf8");

describe("itinerary route behavior", () => {
  it("uses the shared location search input and does not call browser REST geocoding", () => {
    const routeSource = source();

    expect(routeSource).toContain('from "@/components/diplolife/forms/LocationSearchInput"');
    expect(routeSource).toContain("<LocationSearchInput");
    expect(routeSource).toContain("onResolvedLocation");
    expect(routeSource).toContain("loadGoogleMapsScript={!mapsApiKey}");
    expect(routeSource).not.toContain("maps.googleapis.com/maps/api/geocode/json");
  });

  it("uses a single Google Maps provider for itinerary map and Places lookup", () => {
    const routeSource = source();

    expect(routeSource).toContain('const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"]');
    expect(routeSource).toContain("libraries={GOOGLE_MAPS_LIBRARIES}");
  });

  it("shows an onboarding handoff when itinerary prerequisites are missing", () => {
    const routeSource = source();

    expect(routeSource).toContain("getItineraryPrerequisiteState");
    expect(routeSource).toContain('to="/onboarding"');
    expect(routeSource).toContain("泥대쪟 ?뺣낫 癒쇱? ?ㅼ젙?섍린");
  });

  it("connects cost budget state to itinerary generation", () => {
    const routeSource = source();

    expect(routeSource).toContain('from "@/components/itinerary/ItineraryBudgetPanel"');
    expect(routeSource).toContain("createItineraryBudgetPlan");
    expect(routeSource).toContain("budgetPlan");
    expect(routeSource).toContain("setTotalBudgetKrw");
    expect(routeSource).toContain("<ItineraryBudgetPanel");
  });

  it("routes generated recommendations into the day-tab workspace instead of a standalone map/list split", () => {
    const routeSource = source();

    expect(routeSource).toContain("setResultView(\"workspace\")");
    expect(routeSource).toContain("const workspaceContent = (");
    expect(routeSource).toContain("const generatorContent = (");
    expect(routeSource).toContain("const itineraryContent = shouldShowWorkspace ? workspaceContent : generatorContent");
    expect(routeSource).toContain("const shouldShowWorkspace = places.length > 0 && resultView === \"workspace\"");
    expect(routeSource).toContain("<ItineraryWorkspace");
    expect(routeSource).toContain("places={places}");
    expect(routeSource).toContain("selectedPlaceIndex={selectedIndex}");
  });

  it("generates only the initial day and keeps later day generation lazy", () => {
    const routeSource = source();

    expect(routeSource).toContain("createDayGenerationPayload");
    expect(routeSource).toContain("getInitialGenerationDays");
    expect(routeSource).toContain("generatedDaysSoFar");
    expect(routeSource).toContain("for (let dayIndex = 1; dayIndex <= targetDays; dayIndex += 1)");
    expect(routeSource).toContain("dayGenerationMutation");
    expect(routeSource).toContain("handleGenerateDay");
    expect(routeSource).toContain("setPlacesByDay");
    expect(routeSource).toContain("collectItineraryPlaceExclusions(generatedDaysSoFar.flatMap");
    expect(routeSource).toContain("createDayDiversityProfile");
    expect(routeSource).toContain("placesByDay={placesByDay}");
    expect(routeSource).toContain("onGenerateDay={handleGenerateDay}");
    expect(routeSource).toContain("const pendingDayGenerationIndex = dayGenerationMutation.isPending");
    expect(routeSource).toContain("generatingDayIndex={pendingDayGenerationIndex}");
  });

  it("persists later generated Day tabs into the same saved itinerary record", () => {
    const routeSource = source();

    expect(routeSource).toContain("updateItineraryHistory");
    expect(routeSource).toContain("const [activeHistoryId, setActiveHistoryId]");
    expect(routeSource).toContain("activeHistoryIdRef.current");
    expect(routeSource).toContain("persistItineraryHistory(historyRecord, { mode: \"insert\" })");
    expect(routeSource).toContain("persistItineraryHistory(historyRecord)");
    expect(routeSource).toContain("setActiveHistoryId(history.id ?? null)");
  });

  it("restores generated itineraries only when the persisted itinerary matches the current profile", () => {
    const routeSource = source();

    expect(routeSource).toContain("isStoredItineraryForProfile");
    expect(routeSource).toContain("useDiploLifeStore.getState().userProfile");
    expect(routeSource).toContain("destinationCountry");
    expect(routeSource).toContain("destinationCity");
    expect(routeSource).toContain("tripStartDate");
    expect(routeSource).toContain("tripEndDate");
    expect(routeSource).not.toContain("itineraryProfile");
  });

  it("reseeds itinerary storage with an empty trip when onboarding completes", () => {
    const routeSource = onboardingSource();

    expect(routeSource).toContain('from "@/store/itineraryStore"');
    expect(routeSource).toContain("createItineraryStoreSeed({ profile: finalProfile })");
    expect(routeSource).toContain("useItineraryStore.getState().initializeTrip(");
  });

  it("shows a per-day generation action when the selected Day has no generated places", () => {
    const componentSource = workspaceSource();

    expect(componentSource).toContain("onGenerateDay");
    expect(componentSource).toContain("generatingDayIndex");
    expect(componentSource).toContain("Day {activeDay} ?쇱젙 ?앹꽦?섍린");
    expect(componentSource).toContain("onClick={() => onGenerateDay?.(activeDay)}");
  });

  it("renders only Google Directions routes on the itinerary map, not straight polyline fallbacks", () => {
    const componentSource = mapSource();

    expect(componentSource).toContain('from "./MapDirectionsRoute"');
    expect(componentSource).toContain("<MapDirectionsRoute");
    expect(componentSource).not.toContain('from "./MapRoute"');
    expect(componentSource).not.toContain("createSelectedRouteSegment");
    expect(componentSource).not.toContain("<MapRoute ");
  });
});
