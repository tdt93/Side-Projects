"use client";

import { useTranslations } from "next-intl";
import type { OrderLineDto } from "@/components/providers/RestaurantProvider";
import { formatMoney } from "@/lib/currency";
import { CATEGORY_I18N_KEYS } from "@/lib/menu-categories";
import { groupItemsByCategory } from "@/lib/order-display";

type Props = {
  items: OrderLineDto[];
  menuItems: { id: string; category: string }[];
  currency: string;
  dark?: boolean;
  compact?: boolean;
  showPrices?: boolean;
  action?: (item: OrderLineDto) => React.ReactNode;
};

export function OrderItemsGrouped({
  items,
  menuItems,
  currency,
  dark = false,
  compact = false,
  showPrices = true,
  action,
}: Props) {
  const tCat = useTranslations("menuCategories");
  const groups = groupItemsByCategory(items, menuItems);

  if (groups.length === 0) return null;

  const heading = dark ? "text-[#6B5B50]" : "text-muted-foreground";
  const rowText = dark ? "text-[#D4C4B8]" : "text-foreground";
  const rowMuted = dark ? "text-[#6B5B50]" : "text-muted-foreground";
  const groupBg = dark ? "bg-white/5" : "bg-muted/40";

  function categoryLabel(cat: string) {
    const key = CATEGORY_I18N_KEYS[cat as keyof typeof CATEGORY_I18N_KEYS];
    return key ? tCat(key) : cat;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {groups.map(({ category, items: catItems }) => (
        <div key={category} className={`rounded-xl ${groupBg} ${compact ? "p-2" : "p-3"}`}>
          <p className={`mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider ${heading}`}>
            {categoryLabel(category)}
          </p>
          <div className="space-y-1.5">
            {catItems.map((item) => (
              <div key={item.menuItemId} className={`flex items-center justify-between gap-2 text-sm ${rowText}`}>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{item.name}</span>
                  {showPrices && (
                    <span className={`ml-2 text-xs ${rowMuted}`}>{formatMoney(item.priceGrosze, currency)}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${dark ? "bg-white/10" : "bg-background"}`}
                  >
                    ×{item.quantity}
                  </span>
                  {showPrices && (
                    <span className={`min-w-14 text-right font-mono text-xs ${rowMuted}`}>
                      {formatMoney(item.priceGrosze * item.quantity, currency)}
                    </span>
                  )}
                  {action?.(item)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
