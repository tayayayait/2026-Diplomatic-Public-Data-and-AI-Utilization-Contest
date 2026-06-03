import React, { useEffect } from 'react';
import { useItineraryStore } from '@/store/itineraryStore';
import { TimelineSlotCard } from './TimelineSlotCard';
import { Button } from '@/components/ui/button';
import { Sparkles, CalendarX2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';

export const Timeline = ({ dayIndex, onLazyGenerate }: { dayIndex: number; onLazyGenerate?: () => void }) => {
  const { days, injectAccommodationReturn } = useItineraryStore();
  const dayData = days[dayIndex];

  const { isOver, setNodeRef } = useDroppable({
    id: `timeline-${dayIndex}`,
    data: { type: 'timeline', dayIndex },
  });

  // 留덉슫?????숈냼 蹂듦? ?쒗뵆由?二쇱엯 (?덉쟾 ?μ튂)
  useEffect(() => {
    if (dayData && dayData.isGenerated) {
      injectAccommodationReturn(dayIndex);
    }
  }, [dayIndex, dayData?.isGenerated, injectAccommodationReturn]);

  if (!dayData) return null;

  if (!dayData.isGenerated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 min-h-[50vh]">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <CalendarX2 className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">?쇱젙???앹꽦?섏? ?딆븯?듬땲??</h3>
        <p className="text-muted-foreground max-w-sm mb-6 text-sm leading-relaxed">
          ?κ린 ?ы뻾???먰솢???섏젙???꾪빐 ?꾨컲遺 ?쇱젙? 吏???앹꽦?⑸땲?? ?댁쟾 ?쇱젙??諛뷀깢?쇰줈 AI媛 理쒖쟻???숈꽑???댁뼱 洹몃젮?쒕┰?덈떎.
        </p>
        <Button className="shadow-md hover:shadow-lg transition-all" size="lg" onClick={onLazyGenerate}>
          <Sparkles className="w-4 h-4 mr-2" />
          Day {dayIndex} ?댁뼱 洹몃━湲?        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Day {dayData.dayIndex} ?쇱젙</h2>
          <p className="text-muted-foreground mt-1 flex items-center text-sm">
            {dayData.date}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          珥?<span className="font-medium text-foreground">{dayData.slots.length}</span>媛쒖쓽 ?쇱젙
        </div>
      </div>
      
      <div 
        ref={setNodeRef}
        className={`flex flex-col relative transition-colors p-2 rounded-xl ${isOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : 'border-2 border-transparent'}`}
      >
        {/* ?꾩껜 ??꾨씪??諛곌꼍 ??*/}
        <div className="absolute left-[21px] top-4 bottom-8 w-[2px] bg-border/50 -z-10" />
        
        {dayData.slots.map((slot, index) => (
          <TimelineSlotCard key={slot.id} slot={slot} index={index} dayIndex={dayIndex} />
        ))}
        
        {dayData.slots.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
            <p className="font-medium mb-1">異붽????쇱젙???놁뒿?덈떎.</p>
            <p className="text-sm opacity-80">?곗륫 蹂닿??⑥뿉???μ냼瑜??뚯뼱???볦븘 ?쇱젙??援ъ꽦??蹂댁꽭??</p>
          </div>
        )}
      </div>
    </div>
  );
};
