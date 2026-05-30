import type { StaffRole } from "./session";

export function roleDashboardPath(role: StaffRole, locale = "vi") {
  const map: Record<StaffRole, string> = {
    OWNER: `/${locale}/owner`,
    KITCHEN: `/${locale}/kitchen`,
    CASHIER: `/${locale}/cashier`,
  };
  return map[role];
}
