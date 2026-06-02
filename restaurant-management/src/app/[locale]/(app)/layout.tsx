import { AppAuthGate } from "@/components/auth/AppAuthGate";
import { RestaurantProvider } from "@/components/providers/RestaurantProvider";
import { ThemeSync } from "@/components/providers/ThemeSync";
import { TenantThemeStyle } from "@/components/theme/TenantThemeStyle";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGate>
      <RestaurantProvider>
        <TenantThemeStyle />
        <ThemeSync />
        {children}
      </RestaurantProvider>
    </AppAuthGate>
  );
}
