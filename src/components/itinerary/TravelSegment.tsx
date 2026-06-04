import { Footprints, Train, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface TravelSegmentProps {
  minutes: number;
  distance: string;
  className?: string;
}

export function TravelSegment({ minutes, distance, className }: TravelSegmentProps) {
  // 간단한 로직: 20분 이상이거나 거리가 멀면 대중교통이나 차량 아이콘을 사용할 수도 있지만
  // 일단 도보를 기본으로 하고 추후 확장 가능하도록 아이콘 설정
  const isWalking = distance.includes("도보") || minutes <= 20;
  const isTransit = distance.includes("지하철") || distance.includes("버스");
  
  const Icon = isTransit ? Train : (isWalking ? Footprints : Car);

  return (
    <div className={cn("relative flex items-center h-12 ml-[19px]", className)}>
      {/* 점선 (전체 각 연결선 역할) */}
      <div className="absolute top-0 bottom-0 left-[1px] w-[2px] bg-border border-l-2 border-dotted border-muted-foreground/30 -z-10" />
      
      {/* 이동 정보 배지 */}
      <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-sm border border-border px-2 py-1 rounded-full text-[11px] font-medium text-muted-foreground shadow-sm z-10 translate-x-[-12px] my-auto">
        <Icon className="w-3.5 h-3.5 opacity-70" />
        <span>
          {isWalking && !distance.includes("도보") ? "도보 " : ""}
          {distance} ({minutes}분)
        </span>
      </div>
    </div>
  );
}
