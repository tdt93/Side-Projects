const now = Date.now();

export type AnalyticsPoint = {
  revenue: number;
  orders: number;
  date?: string;
  month?: string;
  year?: string;
  profit?: number;
  customers?: number;
};

export { MENU_CATEGORIES } from "@/lib/menu-categories";

export function generateDailyRevenue() {
  const data = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const base = isWeekend ? 450000 : 280000;
    const revenue = Math.round((base + (Math.sin(i * 7.3) * 0.5 + 0.5) * 150000) * 100) / 100;
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue,
      orders: Math.round(revenue / 3800),
      customers: Math.round(revenue / 2200),
    });
  }
  return data;
}

export function generateMonthlyRevenue() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  return Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (currentMonth - 11 + i + 12) % 12;
    const isSummer = monthIdx >= 5 && monthIdx <= 8;
    const base = isSummer ? 9500000 : 7200000;
    const revenue = Math.round((base + Math.abs(Math.sin(i * 3.7)) * 2500000) * 100) / 100;
    return {
      month: months[monthIdx],
      revenue,
      orders: Math.round(revenue / 4200),
      profit: Math.round(revenue * 0.28),
    };
  });
}

export function generateYearlyRevenue() {
  const y = new Date().getFullYear();
  return [
    { year: String(y - 4), revenue: 78000000, profit: 19500000, orders: 18200 },
    { year: String(y - 3), revenue: 85600000, profit: 22100000, orders: 20100 },
    { year: String(y - 2), revenue: 91200000, profit: 24800000, orders: 21800 },
    { year: String(y - 1), revenue: 104500000, profit: 29800000, orders: 24900 },
    { year: String(y), revenue: 48500000, profit: 14200000, orders: 11500 },
  ];
}

export const TOP_DISHES = [
  { name: "Tiramisu", orders: 445, revenue: 400500 },
  { name: "Spaghetti Carbonara", orders: 342, revenue: 615600 },
  { name: "Caesar Salad", orders: 312, revenue: 343200 },
  { name: "Margherita", orders: 298, revenue: 476800 },
  { name: "Chocolate Lava Cake", orders: 389, revenue: 389000 },
  { name: "Truffle Funghi", orders: 224, revenue: 492800 },
  { name: "Grilled Salmon", orders: 201, revenue: 562800 },
  { name: "Beef Tenderloin", orders: 187, revenue: 785400 },
];

export const PEAK_HOURS = [
  { hour: "10am", orders: 12 },
  { hour: "11am", orders: 28 },
  { hour: "12pm", orders: 86 },
  { hour: "1pm", orders: 94 },
  { hour: "2pm", orders: 67 },
  { hour: "3pm", orders: 34 },
  { hour: "4pm", orders: 21 },
  { hour: "5pm", orders: 45 },
  { hour: "6pm", orders: 88 },
  { hour: "7pm", orders: 112 },
  { hour: "8pm", orders: 98 },
  { hour: "9pm", orders: 76 },
  { hour: "10pm", orders: 42 },
];

export const REVENUE_BY_CATEGORY = [
  { category: "Mains", value: 3850000 },
  { category: "Pizza", value: 2280000 },
  { category: "Pasta", value: 1920000 },
  { category: "Combos", value: 1520000 },
  { category: "Beverages", value: 1260000 },
  { category: "Starters", value: 1140000 },
  { category: "Desserts", value: 980000 },
];

export const DAILY = generateDailyRevenue();
export const MONTHLY = generateMonthlyRevenue();
export const YEARLY = generateYearlyRevenue();

export const CHART_COLORS = ["#C4622D", "#F59E0B", "#3B82F6", "#16A34A", "#8B5CF6", "#EC4899", "#06B6D4"];
