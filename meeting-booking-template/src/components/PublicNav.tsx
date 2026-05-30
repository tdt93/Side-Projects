import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

function AdminPanelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

export function PublicNav({
  siteName,
  headerAction = "admin",
  disableHomeLink = false,
}: {
  siteName: string;
  /** W panelu admin: wyloguj zamiast ikony wejścia do panelu */
  headerAction?: "admin" | "logout" | "none";
  /** Na podstronach terapeuty logo nie przekierowuje na stronę główną */
  disableHomeLink?: boolean;
}) {
  const logo = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/trzymsie-logo.png"
        alt={siteName}
        className="h-10 w-auto object-contain"
      />
      <span className="sr-only">{siteName}</span>
    </>
  );

  return (
    <header className="border-b border-[#b9e9f5]/60 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        {disableHomeLink ? (
          <div className="inline-flex items-center gap-3 text-xl font-semibold text-[#37B3D6]">
            {logo}
          </div>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-xl font-semibold text-[#37B3D6]"
          >
            {logo}
          </Link>
        )}
        {headerAction === "logout" ? (
          <LogoutButton className="shrink-0 shadow-sm" />
        ) : headerAction === "admin" ? (
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-[#b9e9f5] bg-white p-2.5 text-[#37B3D6] shadow-sm transition hover:border-[#37B3D6] hover:bg-[#F3FAFC]"
            aria-label="Panel administracyjny"
            title="Panel administracyjny"
          >
            <AdminPanelIcon className="h-[22px] w-[22px]" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
