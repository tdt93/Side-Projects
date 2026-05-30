"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { KitchenDashboard } from "@/components/dashboard/KitchenDashboard";

export default function KitchenPage() {
  const locale = useLocale();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "PATCH" });
    router.push(`/${locale}/app/roles`);
  }

  return <KitchenDashboard onLogout={() => void logout()} />;
}
