import React, { useMemo } from "react";
import {
  Bed,
  Home,
  ShoppingBasket,
  TrainFront,
  CarTaxiFront,
  Utensils,
  Wifi,
  Dumbbell,
  Shirt,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDiploLifeStore } from "@/lib/diplolife/state";
import type { CityPriceItem } from "@/lib/diplolife/api/wherenext";

const CATEGORY_UI: Record<string, { label: string; icon: React.ElementType }> = {
  숙박: { label: "숙박 (호텔/에어비앤비)", icon: Bed },
  "외식 및 카페": { label: "식음료 및 외식", icon: Utensils },
  "마트 및 생필품": { label: "마트 장보기", icon: ShoppingBasket },
  교통비: { label: "교통수단", icon: CarTaxiFront },
  통신비: { label: "통신비 (데이터)", icon: Wifi },
  // Legacy mappings fallback
  Groceries: { label: "식료품", icon: ShoppingBasket },
  "Restaurants & Cafes": { label: "외식 및 카페", icon: Utensils },
  Transport: { label: "교통비", icon: TrainFront },
  Housing: { label: "주거비", icon: Home },
  "Utilities & Internet": { label: "공과금 및 통신", icon: Wifi },
  "Leisure & Fitness": { label: "여가 및 운동", icon: Dumbbell },
  Clothing: { label: "쇼핑 및 의류", icon: Shirt },
};

function getCategoryUI(key: string) {
  return CATEGORY_UI[key] || { label: key, icon: CircleDollarSign };
}

const formatMoney = (amount: number, currency: string) =>
  `${amount.toLocaleString("ko-KR", {
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  })} ${currency}`;

export function LocalPriceCard() {
  const costInsight = useDiploLifeStore((state) => state.costInsight);

  const localCurrency = costInsight.localCurrency || "USD";
  const localCurrencyKrwRate = costInsight.localCurrencyKrwRate || costInsight.usdToKrwRate || 1;
  const cityItems = costInsight.cityPrices?.data?.slice(0, 10) || [];

  const groupedItems = useMemo(() => {
    const groups: Record<string, CityPriceItem[]> = {};
    for (const item of cityItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [cityItems]);

  const hasItems = Object.keys(groupedItems).length > 0;

  return (
    <Card className="overflow-hidden border-0 shadow-md ring-1 ring-border/40">
      <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-transparent pb-5 pt-6">
        <CardTitle className="flex items-center gap-2.5 text-xl tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          현지 물가 체감
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 bg-background/50">
        {!hasItems ? (
          <div className="py-8">
            <p className="rounded-2xl border border-dashed border-border/80 bg-surface-alt/30 p-8 text-center text-sm font-medium text-muted-foreground shadow-sm">
              물가 데이터를 수집 중이거나 아직 사용할 수 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            {Object.entries(groupedItems).map(([category, items]) => {
              const { label, icon: Icon } = getCategoryUI(category);
              return (
                <div
                  key={category}
                  className="flex flex-col rounded-2xl border border-border/50 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex items-center gap-2.5 border-b border-border/40 pb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-foreground tracking-tight">{label}</h3>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {items.map((item) => {
                      const krwAmount = Math.round(item.price_local * localCurrencyKrwRate);
                      return (
                        <div
                          key={item.item}
                          className="group flex items-center justify-between gap-3"
                        >
                          <div className="flex-1 pr-2">
                            <p className="text-[13px] font-medium leading-snug text-foreground/80 group-hover:text-primary transition-colors">
                              {item.item}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[14px] font-bold tracking-tight text-foreground">
                              {formatMoney(item.price_local, localCurrency)}
                            </p>
                            {krwAmount > 0 && (
                              <p className="text-[11px] font-semibold text-muted-foreground/70">
                                {krwAmount.toLocaleString("ko-KR")} KRW
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
