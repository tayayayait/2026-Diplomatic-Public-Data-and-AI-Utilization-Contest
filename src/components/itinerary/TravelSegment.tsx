import { Footprints, Train, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface TravelSegmentProps {
  minutes: number;
  distance: string;
  className?: string;
}

export function TravelSegment({ minutes, distance, className }: TravelSegmentProps) {
  // 媛꾨떒??濡쒖쭅: 20遺??댁긽?닿굅??嫄곕━媛 硫硫??以묎탳??李⑤웾 ?꾩씠肄섏쓣 ?ъ슜???섎룄 ?덉?留?
  // ?쇰떒 ?꾨낫瑜?湲곕낯?쇰줈 ?섍퀬 異뷀썑 ?뺤옣 媛?ν븯?꾨줉 ?꾩씠肄??ㅼ젙
  const isWalking = distance.includes("?꾨낫") || minutes <= 20;
  const isTransit = distance.includes("吏?섏쿋") || distance.includes("踰꾩뒪");
  
  const Icon = isTransit ? Train : (isWalking ? Footprints : Car);

  return (
    <div className={cn("relative flex items-center h-12 ml-[19px]", className)}>
      {/* ?먯꽑 (?꾩젽 媛??곌껐????븷) */}
      <div className="absolute top-0 bottom-0 left-[1px] w-[2px] bg-border border-l-2 border-dotted border-muted-foreground/30 -z-10" />
      
      {/* ?대룞 ?뺣낫 諭껋? */}
      <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-sm border border-border px-2 py-1 rounded-full text-[11px] font-medium text-muted-foreground shadow-sm z-10 translate-x-[-12px] my-auto">
        <Icon className="w-3.5 h-3.5 opacity-70" />
        <span>
          {isWalking && !distance.includes("?꾨낫") ? "?꾨낫 " : ""}
          {distance} ({minutes}遺?
        </span>
      </div>
    </div>
  );
}
