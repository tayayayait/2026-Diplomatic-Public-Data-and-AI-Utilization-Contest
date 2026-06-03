import { useDiploLifeStore } from "@/lib/diplolife/state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CATEGORY_ICON } from "@/lib/diplolife/cost-translations";

export function SmartTipsCard() {
  const costInsight = useDiploLifeStore((state) => state.costInsight);
  const analysis = costInsight.analysis;
  const status = costInsight.status;

  if (status === "loading" && !analysis) {
    return (
      <Card className="w-full">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.recommendations) return null;

  // 湲곕낯?곸쑝濡?泥?踰덉㎏? ??踰덉㎏ ?꾩씠???닿린
  const defaultValue = analysis.recommendations.map((_, i) => `item-${i}`).slice(0, 2);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" /> 
          AI ?꾩? ?덉빟 ??        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {analysis.recommendations.length > 0 && (
          <Accordion type="multiple" defaultValue={defaultValue} className="w-full">
            {analysis.recommendations.map((rec, i) => {
              const icon = CATEGORY_ICON[rec.category] || "?뮕";
              return (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-sm font-medium hover:no-underline hover:bg-muted/50 px-2 rounded-md transition-colors text-left">
                    <span className="flex items-center gap-2">
                      <span>{icon}</span> {rec.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pt-2 pb-3">
                    <p className="text-muted-foreground leading-relaxed">
                      {rec.description}
                    </p>
                    {rec.estimatedSaving && (
                      <div className="mt-2 inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
                        ?덉빟 ?④낵: {rec.estimatedSaving}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {analysis.savingTips && analysis.savingTips.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold text-sm">Text</h4>
            <ul className="space-y-2">
              {analysis.savingTips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">Text</span>
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
