import Link from "next/link";
import type { PublicFooterCompany } from "@/lib/public-footer";

const legalLinks = [
  { label: "Polityka prywatności", href: "#" },
  { label: "Regulamin", href: "#" },
  { label: "Informacje dot. przetwarzania danych", href: "#" },
  { label: "Standardy ochrony małoletnich (wersja skrócona)", href: "#" },
  { label: "Standardy ochrony małoletnich", href: "#" },
] as const;

export function PublicFooter({ company }: { company: PublicFooterCompany }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#b9e9f5]/60 bg-[#EEEEFF] text-slate-700">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <address className="space-y-1 not-italic leading-relaxed text-slate-700">
            <p>
              <a
                href={`mailto:${company.email}`}
                className="font-medium text-[#37B3D6] no-underline hover:opacity-90"
              >
                {company.email}
              </a>
            </p>
            <p className="font-medium text-[#003C79]">{company.legalName}</p>
            <p>{company.addressLine1}</p>
            <p>{company.addressLine2}</p>
            <p className="whitespace-pre-line pt-2 text-xs text-slate-600">
              {company.registryText}
            </p>
          </address>
          <ul className="flex flex-col gap-2">
            {legalLinks.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="font-medium text-[#37B3D6] no-underline hover:opacity-90"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 border-t border-[#b9e9f5]/80 pt-6 text-center text-slate-600">
          © {year} Trzymsie.pl
        </div>
      </div>
    </footer>
  );
}
