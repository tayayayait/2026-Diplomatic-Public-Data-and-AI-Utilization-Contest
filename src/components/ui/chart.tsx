import * as React from "react";
import * as RechartsPrimitive from "recharts";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig;
    children: React.ReactNode;
  }
>(({ className, children, config, style, ...props }, ref) => {
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value.color) {
        vars[`--color-${key}`] = value.color;
      }
    }
    return vars;
  }, [config]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...cssVars, ...style } as React.CSSProperties}
      {...props}
    >
      <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  );
});
ChartContainer.displayName = "Chart";

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<HTMLDivElement, any>(
  ({ className, active, payload, label }, ref) => {
    if (!active || !payload?.length) {
      return null;
    }
    return (
      <div ref={ref} className={`rounded-lg border border-border bg-background p-3 shadow-md ${className || ""}`}>
        <div className="mb-2 text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name === "actual" ? "실제 환율" : item.name === "predicted" ? "예측 환율" : item.name}</span>
              </div>
              <span className="font-mono font-medium">
                {item.value ? new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 4 }).format(item.value) : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<HTMLDivElement, any>(
  ({ className }, ref) => (
    <div ref={ref} className={className}>
      {/* Basic legend content placeholder */}
    </div>
  ),
);
ChartLegendContent.displayName = "ChartLegend";

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
