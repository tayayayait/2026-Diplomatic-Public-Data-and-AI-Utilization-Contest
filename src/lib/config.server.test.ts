import { describe, expect, it } from "vitest";
import { validateServerConfig } from "./config.server";

describe("server config validation", () => {
  it("reports storage errors and missing public-data key", () => {
    expect(
      validateServerConfig({
        nodeEnv: "test",
        dataGoKrServiceKey: undefined,
        geminiApiKey: "gemini-key",
        googlePlacesApiKey: undefined,
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key",
        saferouteStorageDir: "",
      }),
    ).toEqual([
      {
        code: "SAFEROUTE_STORAGE_DIR_REQUIRED",
        severity: "error",
        message: "SAFEROUTE_STORAGE_DIR must not be empty.",
      },
      {
        code: "DATA_GO_KR_SERVICE_KEY_MISSING",
        severity: "error",
        message: "DATA_GO_KR_SERVICE_KEY is missing.",
      },
      {
        code: "GOOGLE_PLACES_API_KEY_MISSING",
        severity: "warning",
        message:
          "GOOGLE_PLACES_API_KEY is missing; local place and itinerary cards will show Google-data-unavailable fallback.",
      },
    ]);
  });
});
