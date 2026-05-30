export const MENU_CATEGORIES = [
  "Starters",
  "Mains",
  "Pizza",
  "Pasta",
  "Desserts",
  "Beverages",
  "Combos",
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const CATEGORY_I18N_KEYS: Record<MenuCategory, string> = {
  Starters: "starters",
  Mains: "mains",
  Pizza: "pizza",
  Pasta: "pasta",
  Desserts: "desserts",
  Beverages: "beverages",
  Combos: "combos",
};
