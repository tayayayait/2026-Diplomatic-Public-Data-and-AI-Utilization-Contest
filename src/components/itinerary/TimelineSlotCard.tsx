import React, { memo } from 'react';
import { TimelineSlot, useItineraryStore } from '@/store/itineraryStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Bed, GripVertical, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PlaceThumbnail } from './PlaceThumbnail';

interface TimelineSlotCardProps {
  slot: TimelineSlot;
  index: number;
  dayIndex: number;
}

export const TimelineSlotCard = memo(({ slot, index, dayIndex }: TimelineSlotCardProps) => {
  const isAccommodation = slot.slotType === 'accommodation_return';
  const isMandatory = slot.slotType === 'mandatory';
  const { removeSlot } = useItineraryStore();

  const handleRemove = () => {
    if (isAccommodation || isMandatory) {
      toast.error('?꾩닔 ?쇱젙?대굹 湲곕낯 ?쒗뵆由우? ??젣?????놁뒿?덈떎.');
      return;
    }
    removeSlot(dayIndex, slot.id);
  };
  
  return (
    <div className="flex gap-4 group relative w-full min-w-0">
      {/* ??꾨씪???곌껐??*/}
      <div className="flex flex-col items-center mt-1">
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 z-10 bg-background shadow-sm",
          isAccommodation ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"
        )}>
          {index + 1}
        </div>
        {!isAccommodation && <div className="w-[2px] flex-1 bg-border my-2 group-hover:bg-primary/30 transition-colors" />}
      </div>

      <Card className={cn(
        "flex-1 min-w-0 p-3.5 mb-4 flex gap-3 relative transition-all duration-200 group-hover:shadow-md border",
        isAccommodation ? "bg-primary/5 border-primary/20" : "bg-background hover:border-border/80"
      )}>
        {/* Drag Handle */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground bg-background border shadow-sm rounded-md p-1 transition-opacity z-20 hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Delete Button (optional slots only) */}
        {!isAccommodation && !isMandatory && (
          <button 
            onClick={handleRemove}
            className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isAccommodation ? (
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
            "bg-primary/10 text-primary"
          )}>
            <Bed className="w-6 h-6" />
          </div>
        ) : (
          <PlaceThumbnail
            photoUrl={slot.place?.imageUrl}
            category={slot.place?.type === 'restaurant' || slot.place?.type === 'cafe' ? slot.place.type : (slot.place?.type === 'mart' ? 'mart' : 'attraction')}
            size="sm"
          />
        )}
        
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 pr-4">
              <h4 className="font-semibold text-sm leading-tight text-foreground truncate">
                {slot.place?.name || slot.memo || '鍮꾩뼱?덈뒗 ?щ’'}
              </h4>
              {slot.place && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {slot.place.description || slot.place.type}
                </p>
              )}
            </div>
            
            {slot.startTime && (
              <div className="flex shrink-0 items-center text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <Clock className="w-3 h-3 mr-1" />
                {slot.startTime} {slot.endTime ? `- ${slot.endTime}` : ''}
              </div>
            )}
          </div>

          {isAccommodation && (
            <div className="mt-2">
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-[10px] px-1.5 py-0">
                湲곕낯 ?쒗뵆由?              </Badge>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
});

TimelineSlotCard.displayName = 'TimelineSlotCard';
