import { redirect } from "next/navigation";
import { AdminDashboardNav } from "@/components/AdminDashboardNav";
import { PublicNav } from "@/components/PublicNav";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function AdminDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/admin/login");
  }

  const settings =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }));

  const role = session.role as "SUPER_ADMIN" | "THERAPIST";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicNav siteName={settings.siteName} headerAction="logout" />

      <div className="border-b border-slate-200 bg-white md:hidden">
        <AdminDashboardNav variant="mobile" role={role} />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 md:grid md:grid-cols-[280px_1fr] md:gap-10 md:px-6 md:py-10">
        <aside className="hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:block md:self-start">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Menu
          </p>
          <AdminDashboardNav variant="desktop" role={role} />
        </aside>

        <main className="px-5 py-8 md:rounded-xl md:border md:border-slate-200 md:bg-white md:px-8 md:py-8 md:shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
