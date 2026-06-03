import { Info, Map, Moon, Sun, Sunset } from "lucide-react";
import type { LocalItineraryResult } from "../../../lib/diplolife/api/gemini-recommendation";
import { PlaceCard } from "./PlaceCard";

interface ItineraryTimelineProps {
  data: LocalItineraryResult;
}

export function ItineraryTimeline({ data }: ItineraryTimelineProps) {
  const getTimeInfo = (timeOfDay: string) => {
    switch (timeOfDay) {
      case "Morning":
        return { label: "?ㅼ쟾 ?쇱젙", icon: <Sun className="w-5 h-5 text-amber-500" />, color: "border-amber-200", bg: "bg-amber-50" };
      case "Afternoon":
        return { label: "?ㅽ썑 ?쇱젙", icon: <Sunset className="w-5 h-5 text-orange-500" />, color: "border-orange-200", bg: "bg-orange-50" };
      case "Evening":
        return { label: "????쇱젙", icon: <Moon className="w-5 h-5 text-indigo-500" />, color: "border-indigo-200", bg: "bg-indigo-50" };
      default:
        return { label: "?쇱젙", icon: <Map className="w-5 h-5 text-slate-500" />, color: "border-slate-200", bg: "bg-slate-50" };
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm mt-6">
      <div className="mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {data.title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm leading-relaxed">
          {data.description}
        </p>
        
        <div className="flex flex-col gap-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Google 媛寃??뺣낫 湲곗?</span>
          <span className="text-sm font-bold text-blue-700 dark:text-blue-400 sm:text-right">
            {data.totalCostBasisText ?? "Google Places 媛寃??꾨뱶 誘명솗??"}
          </span>
        </div>
      </div>

      {data.dataQualityNotices && data.dataQualityNotices.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Info className="h-4 w-4" aria-hidden="true" />
            ?곗씠???곗젙 湲곗? ?덈궡
          </div>
          <ul className="space-y-1">
            {data.dataQualityNotices.map((notice, idx) => (
              <li key={idx}>{notice}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative border-l-2 border-gray-100 dark:border-slate-800 ml-4 space-y-8 pb-4">
        {data.itinerary.map((block, index) => {
          const timeInfo = getTimeInfo(block.timeOfDay);
          
          return (
            <div key={index} className="relative pl-6">
              {/* Timeline dot */}
              <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 ${timeInfo.bg} flex items-center justify-center shadow-sm`}>
                {timeInfo.icon}
              </div>
              
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                {timeInfo.label}
              </h4>
              
              <div className="flex flex-col gap-4">
                {block.places.map((place, pIndex) => (
                  <PlaceCard key={pIndex} place={place} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {data.tips && data.tips.length > 0 && (
        <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            ?꾩? ?ы뻾 ??          </h4>
          <ul className="space-y-2">
            {data.tips.map((tip, idx) => (
              <li key={idx} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">Text</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
