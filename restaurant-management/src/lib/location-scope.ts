/** Menu items visible at a branch: shared (null locationId) + location-specific. */
export function menuItemsForLocation<T extends { locationId?: string | null }>(
  items: T[],
  locationId: string | null | undefined,
  viewAll: boolean,
) {
  if (viewAll || !locationId) return items;
  return items.filter((item) => !item.locationId || item.locationId === locationId);
}

export function ordersForLocation<T extends { locationId?: string | null }>(
  orders: T[],
  locationId: string | null | undefined,
  viewAll: boolean,
) {
  if (viewAll) return orders;
  if (!locationId) return orders;
  return orders.filter((o) => o.locationId === locationId);
}

export function tablesForLocation<T extends { locationId?: string | null }>(
  tables: T[],
  locationId: string | null | undefined,
  viewAll: boolean,
) {
  if (viewAll) return tables;
  if (!locationId) return tables;
  return tables.filter((t) => t.locationId === locationId);
}

export type MenuMode = "shared" | "mixed" | "per_location";

export const LOCALE_FLAGS: Record<string, string> = {
  vi: "🇻🇳",
  en: "🇬🇧",
  pl: "🇵🇱",
};
