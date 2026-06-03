export const CHECKLIST_CATEGORIES = ["14 days before departure", "7 days before departure", "1 day before departure", "Arrival preparation", "During stay"] as const;
export const GEMINI_EVIDENCE_API_IDS = ["15095500", "15076237"] as const;
export const GEMINI_EVIDENCE_FIELDS = ["travel_alarm", "embassy", "local_contact", "visa"] as const;
export const GEMINI_COMPANIONS = ["solo", "family", "group", "unknown"] as const;
export const GEMINI_PURPOSES = ["tourism", "business", "study", "volunteer", "transit", "unknown"] as const;

export function createFallbackBriefing(publicData: any, reason: string): any {
  return {
    summary: reason,
    top_risks: [],
    checklist: [],
    emergency_card: { primary_contact: "", phrases: [], action_steps: [] },
    unknowns: []
  };
}

export function listAvailableEvidence(publicData: any): any[] {
  return [];
}

export function normalizeBriefingOutput(raw: any, publicData: any): any {
  return raw;
}

export function normalizeExtractedItinerary(raw: any): any {
  return raw;
}

export function parseGeminiToolArguments(raw: any): any {
  return raw;
}
