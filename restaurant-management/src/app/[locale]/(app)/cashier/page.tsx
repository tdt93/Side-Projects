"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { CashierDashboard } from "@/components/dashboard/CashierDashboard";

export default function CashierPage() {
  const locale = useLocale();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "PATCH" });
    router.push(`/${locale}/app/roles`);
  }
  return <CashierDashboard onLogout={() => void logout()} />;
}
