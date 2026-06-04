import process from "node:process";

export type ServerConfig = ReturnType<typeof getServerConfig>;

export type ServerConfigIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    dataGoKrServiceKey: process.env.DATA_GO_KR_SERVICE_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    googlePlacesApiKey: process.env.VITE_GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
    saferouteStorageDir: process.env.SAFEROUTE_STORAGE_DIR ?? ".data",
  };
}

export function validateServerConfig(
  config: ServerConfig = getServerConfig(),
): ServerConfigIssue[] {
  const issues: ServerConfigIssue[] = [];

  if (!config.saferouteStorageDir?.trim()) {
    issues.push({
      code: "SAFEROUTE_STORAGE_DIR_REQUIRED",
      severity: "error",
      message: "SAFEROUTE_STORAGE_DIR must not be empty.",
    });
  }

  if (!config.dataGoKrServiceKey) {
    issues.push({
      code: "DATA_GO_KR_SERVICE_KEY_MISSING",
      severity: "error",
      message: "DATA_GO_KR_SERVICE_KEY is missing.",
    });
  }
  if (!config.geminiApiKey) {
    issues.push({
      code: "GEMINI_API_KEY_MISSING",
      severity: "error",
      message: "GEMINI_API_KEY is missing.",
    });
  }
  if (!config.googlePlacesApiKey) {
    issues.push({
      code: "GOOGLE_PLACES_API_KEY_MISSING",
      severity: "warning",
      message: "GOOGLE_PLACES_API_KEY is missing; local place and itinerary cards will show Google-data-unavailable fallback.",
    });
  }
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    issues.push({
      code: "SUPABASE_CONFIG_MISSING",
      severity: "error",
      message: "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.",
    });
  }

  return issues;
}
