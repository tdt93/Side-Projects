"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TenantRow = {
  id: string;
  slug: string;
  displayName: string;
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  createdAt: string;
  subscribedMonths: number;
  locationCount: number;
  orderCount: number;
  userCount: number;
};

const STATUS_STYLE: Record<string, string> = {
  TRIAL: "bg-amber-500/20 text-amber-300",
  ACTIVE: "bg-green-500/20 text-green-300",
  PAST_DUE: "bg-red-500/20 text-red-300",
  CANCELLED: "bg-white/10 text-[#8a7060]",
};

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/platform/auth/session")
      .then((r) => {
        if (!r.ok) router.replace("/platform/login");
      })
      .then(() => fetch("/api/platform/tenants"))
      .then((r) => r.json())
      .then((data) => setTenants(data.tenants ?? []))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/platform/auth/logout", { method: "POST" });
    router.replace("/platform/login");
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Subscribed restaurants</h1>
          <p className="text-sm text-[#8a7060]">{tenants.length} tenant(s) on the platform</p>
        </div>
        <button type="button" onClick={() => void logout()} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#8a7060] hover:text-white">
          Log out
        </button>
      </header>

      {loading ? (
        <p className="text-[#8a7060]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[#6b5b50]">
              <tr>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Ends</th>
                <th className="px-4 py-3">Locations</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Users</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{t.displayName}</p>
                    <p className="font-mono text-xs text-[#6b5b50]">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[t.subscriptionStatus] ?? STATUS_STYLE.CANCELLED}`}>
                      {t.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{t.subscribedMonths} mo</td>
                  <td className="px-4 py-3 text-xs text-[#8a7060]">
                    {t.subscriptionEndsAt ? new Date(t.subscriptionEndsAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono">{t.locationCount}</td>
                  <td className="px-4 py-3 font-mono">{t.orderCount}</td>
                  <td className="px-4 py-3 font-mono">{t.userCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
