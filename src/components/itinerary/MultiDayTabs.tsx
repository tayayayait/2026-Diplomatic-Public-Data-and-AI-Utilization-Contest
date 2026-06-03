import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useItineraryStore } from '@/store/itineraryStore';
import { isLongTermTrip } from '@/lib/itineraryUtils';
import { cn } from '@/lib/utils';
import { CalendarDays, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

export const MultiDayTabs = ({ activeDay, setActiveDay }: { activeDay: number; setActiveDay: (d: number) => void }) => {
  const { days, durationDays } = useItineraryStore();
  const dayValues = Object.values(days);
  const isLongTrip = isLongTermTrip(durationDays);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragged, setIsDragged] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [dayValues.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 250;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsDragged(false);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; 
    
    if (Math.abs(walk) > 10) {
      setIsDragged(true);
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTabClick = (dayIndex: number) => {
    if (isDragged) return; // ?쒕옒洹????대┃ 諛⑹?
    setActiveDay(dayIndex);
  };

  return (
    <div className="w-full border-b bg-background sticky top-0 z-10 pt-2 px-4 group">
      <div className="relative flex items-center">
        {/* 醫뚯륫 ?ㅽ겕濡??붿궡??*/}
        {canScrollLeft && (
          <div className="absolute left-0 z-20 flex h-full items-center bg-gradient-to-r from-background via-background to-transparent pr-4">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full shadow-md bg-background"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ?ㅽ겕濡?而⑦뀒?대꼫 */}
        <div
          ref={scrollContainerRef}
          className={cn(
            "flex w-full space-x-2 py-3 overflow-x-auto",
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onScroll={checkScroll}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
        >
          {dayValues.map((day) => {
            const isActive = activeDay === day.dayIndex;
            const isLocked = isLongTrip && !day.isGenerated;

            return (
              <Button
                key={day.dayIndex}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  'rounded-full px-6 transition-all shrink-0 select-none pointer-events-auto',
                  isLocked && 'opacity-50 grayscale cursor-not-allowed',
                  isActive && 'shadow-sm'
                )}
                onClick={() => handleTabClick(day.dayIndex)}
              >
                {isLocked ? <Lock className="w-4 h-4 mr-2 pointer-events-none" /> : <CalendarDays className="w-4 h-4 mr-2 pointer-events-none" />}
                Day {day.dayIndex}
                <span className="ml-2 text-xs font-normal opacity-70 pointer-events-none">
                  {day.date.split('-').slice(1).join('/')}
                </span>
              </Button>
            );
          })}
        </div>

        {/* ?곗륫 ?ㅽ겕濡??붿궡??*/}
        {canScrollRight && (
          <div className="absolute right-0 z-20 flex h-full items-center bg-gradient-to-l from-background via-background to-transparent pl-4">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full shadow-md bg-background"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
