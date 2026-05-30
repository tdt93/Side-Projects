import { RestaurantProvider } from "@/components/providers/RestaurantProvider";
import { ThemeSync } from "@/components/providers/ThemeSync";
import { TenantThemeStyle } from "@/components/theme/TenantThemeStyle";

export default function AppAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantProvider>
      <TenantThemeStyle />
      <ThemeSync />
      {children}
    </RestaurantProvider>
  );
}
