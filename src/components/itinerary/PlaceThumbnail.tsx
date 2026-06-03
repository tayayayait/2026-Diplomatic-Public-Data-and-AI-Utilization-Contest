import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Landmark, 
  Coffee, 
  Trees, 
  Utensils, 
  ShoppingBag,
  Image as ImageIcon
} from 'lucide-react';
import type { TimelineCategory } from '@/lib/itinerary/timeline-view-model';

interface PlaceThumbnailProps {
  photoUrl?: string;
  category: TimelineCategory | 'restaurant' | 'attraction' | 'cafe' | 'mart' | 'accommodation' | 'custom';
  isMeal?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-12 w-12 rounded-xl',
  md: 'h-16 w-16 rounded-xl',
  lg: 'h-24 w-24 rounded-2xl'
};

const iconSizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

const categoryIcons: Record<string, React.ElementType> = {
  accommodation: Home,
  attraction: Landmark,
  cafe: Coffee,
  culture: Landmark,
  nature: Trees,
  restaurant: Utensils,
  shopping: ShoppingBag,
  mart: ShoppingBag,
  custom: ImageIcon
};

export const PlaceThumbnail = ({ 
  photoUrl, 
  category, 
  isMeal, 
  size = 'md', 
  className 
}: PlaceThumbnailProps) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const Icon = categoryIcons[category] || ImageIcon;
  const isActuallyMeal = isMeal || category === 'restaurant' || category === 'cafe';

  return (
    <div className={cn(
      "shrink-0 flex items-center justify-center border overflow-hidden relative",
      sizeClasses[size],
      isActuallyMeal ? "border-orange-200" : "border-slate-200",
      className
    )}>
      {photoUrl && !imgError ? (
        <>
          {/* 濡쒕뵫 以??ㅼ펷?덊넠/釉붾윭 ?④낵 ??븷 */}
          {!imgLoaded && (
            <div className={cn(
              "absolute inset-0 flex items-center justify-center bg-muted animate-pulse",
            )}>
               <Icon className={cn("text-muted-foreground/30", iconSizeClasses[size])} />
            </div>
          )}
          <img
            src={photoUrl}
            alt="Place thumbnail"
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        </>
      ) : (
        <div className={cn(
          "flex h-full w-full items-center justify-center",
          isActuallyMeal 
            ? "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-400" 
            : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400"
        )}>
          <Icon className={iconSizeClasses[size]} />
        </div>
      )}
    </div>
  );
};
