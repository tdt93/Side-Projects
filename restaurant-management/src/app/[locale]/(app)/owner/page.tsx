"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";

export default function OwnerPage() {
  const locale = useLocale();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "PATCH" });
    router.push(`/${locale}/app/roles`);
  }

  return <OwnerDashboard onLogout={() => void logout()} />;
}
