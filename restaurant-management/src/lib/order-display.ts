import { MENU_CATEGORIES } from "@/lib/menu-categories";

type LineItem = {
  menuItemId: string;
  name: string;
  quantity: number;
  priceGrosze: number;
};

type MenuLookup = { id: string; category: string };

export function groupItemsByCategory(
  items: LineItem[],
  menuItems: MenuLookup[],
  categoryOrder: string[] = [...MENU_CATEGORIES],
): { category: string; items: LineItem[] }[] {
  const byCat = new Map<string, LineItem[]>();
  const menuById = new Map(menuItems.map((m) => [m.id, m.category]));

  for (const item of items) {
    const cat = menuById.get(item.menuItemId) ?? "Other";
    const list = byCat.get(cat) ?? [];
    list.push(item);
    byCat.set(cat, list);
  }

  const ordered = categoryOrder.filter((c) => byCat.has(c)).map((category) => ({
    category,
    items: byCat.get(category)!,
  }));

  for (const [category, catItems] of byCat) {
    if (!categoryOrder.includes(category)) {
      ordered.push({ category, items: catItems });
    }
  }

  return ordered;
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
