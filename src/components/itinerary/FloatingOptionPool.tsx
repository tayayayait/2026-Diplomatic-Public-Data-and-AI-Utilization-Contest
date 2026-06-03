import { GripVertical, Plus } from "lucide-react";

interface FloatingOptionPoolProps {
  options?: Array<{
    id: string;
    title: string;
    subtitle?: string;
  }>;
  onAddOption?: (id: string) => void;
}

export const FloatingOptionPool = ({ options = [], onAddOption }: FloatingOptionPoolProps) => {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Option pool</h3>
          <p className="text-xs text-muted-foreground">Keep alternatives available while editing the itinerary.</p>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>

      {options.length > 0 ? (
        <div className="space-y-2">
          {options.map((option) => (
            <article key={option.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-alt p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{option.title}</p>
                {option.subtitle && <p className="truncate text-xs text-muted-foreground">{option.subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={() => onAddOption?.(option.id)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
                aria-label={`Add ${option.title}`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface-alt p-4 text-sm text-muted-foreground">
          No alternate places are available yet.
        </p>
      )}
    </section>
  );
};
