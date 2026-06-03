import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LocationSearchInput, type ResolvedLocation } from "./LocationSearchInput";

interface PreferenceFilterProps {
  onGenerate: (values: {
    accommodation: string;
    resolvedLocation?: ResolvedLocation | null;
    preferences: string[];
  }) => void;
  isLoading?: boolean;
  initialAccommodation?: string;
}

const DEFAULT_PREFERENCES = [
  "Local food",
  "Culture",
  "Shopping",
  "Nature",
  "Cafe",
  "Landmarks",
  "Low budget",
  "Short walking distance",
];

export function PreferenceFilter({ onGenerate, isLoading, initialAccommodation = "" }: PreferenceFilterProps) {
  const [accommodation, setAccommodation] = useState(initialAccommodation);
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [preferences, setPreferences] = useState<string[]>(["Local food", "Culture"]);

  const togglePreference = (preference: string) => {
    setPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference],
    );
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-foreground">Trip preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a base location and choose the signals the itinerary should prioritize.
        </p>
      </div>

      <LocationSearchInput
        value={accommodation}
        onChange={setAccommodation}
        onResolvedLocation={setResolvedLocation}
        placeholder="Accommodation, station, or starting point"
      />

      <div className="flex flex-wrap gap-2">
        {DEFAULT_PREFERENCES.map((preference) => (
          <button
            key={preference}
            type="button"
            onClick={() => togglePreference(preference)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              preferences.includes(preference)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-surface-alt"
            }`}
          >
            {preference}
          </button>
        ))}
      </div>

      <Button
        type="button"
        disabled={isLoading || !accommodation.trim()}
        onClick={() => onGenerate({ accommodation, preferences, resolvedLocation })}
        className="w-full"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {isLoading ? "Generating..." : "Generate itinerary"}
      </Button>
    </section>
  );
}
