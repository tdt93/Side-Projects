import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { prisma } from "@/lib/db";
import { footerCompanyFromSettings } from "@/lib/public-footer";

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }));
  const company = footerCompanyFromSettings(settings);

  return (
    <>
      <PublicNav siteName={settings.siteName} />
      <div className="flex flex-1 flex-col justify-center bg-slate-50/80 px-4 py-10">
        {children}
      </div>
      <PublicFooter company={company} />
    </>
  );
}
