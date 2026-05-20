import Link from "next/link";

export function TherapistListPagination({
  currentPage,
  totalPages,
  city,
}: {
  currentPage: number;
  totalPages: number;
  city?: string;
}) {
  if (totalPages <= 1) return null;

  const href = (page: number) => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (page > 1) params.set("page", String(page));
    const q = params.toString();
    return q ? `/?${q}` : "/";
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label="Paginacja listy terapeutów"
    >
      <Link
        href={href(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage <= 1}
        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
          currentPage <= 1
            ? "pointer-events-none border-slate-200 text-slate-300"
            : "border-[#b9e9f5] text-[#003C79] hover:bg-[#F3FAFC]"
        }`}
      >
        ← Poprzednia
      </Link>

      <ul className="flex flex-wrap items-center gap-1">
        {pages.map((page) => (
          <li key={page}>
            <Link
              href={href(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition ${
                page === currentPage
                  ? "border-[#37B3D6] bg-[#37B3D6] text-white"
                  : "border-[#b9e9f5] text-[#003C79] hover:bg-[#F3FAFC]"
              }`}
            >
              {page}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={href(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage >= totalPages}
        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
          currentPage >= totalPages
            ? "pointer-events-none border-slate-200 text-slate-300"
            : "border-[#b9e9f5] text-[#003C79] hover:bg-[#F3FAFC]"
        }`}
      >
        Następna →
      </Link>
    </nav>
  );
}
