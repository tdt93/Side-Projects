import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { requireLogin } from "@/lib/admin-auth";
import {
  defaultDirForSort,
  getClientRows,
  parseClientSort,
  sortClientRows,
  type ClientSortKey,
} from "@/lib/clients-stats";

function sortHref(
  col: ClientSortKey,
  currentSort: ClientSortKey,
  currentDir: "asc" | "desc",
) {
  if (currentSort !== col) {
    return `/admin/clients?sort=${col}&dir=${defaultDirForSort(col)}`;
  }
  const next = currentDir === "asc" ? "desc" : "asc";
  return `/admin/clients?sort=${col}&dir=${next}`;
}

function ThLink({
  label,
  col,
  currentSort,
  currentDir,
}: {
  label: string;
  col: ClientSortKey;
  currentSort: ClientSortKey;
  currentDir: "asc" | "desc";
}) {
  const active = currentSort === col;
  return (
    <th className="p-3 text-left font-semibold text-[#003C79]">
      <Link
        href={sortHref(col, currentSort, currentDir)}
        className={`inline-flex items-center gap-1 no-underline hover:opacity-90 ${
          active ? "text-green-700" : "text-[#37B3D6]"
        }`}
      >
        {label}
        {active ? (currentDir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const session = await requireLogin();
  const sp = await searchParams;
  const { sort, dir } = parseClientSort(sp.sort, sp.dir);

  let rows =
    session.role === "THERAPIST" && !session.therapistProfileId
      ? []
      : await getClientRows(
          session.role === "SUPER_ADMIN"
            ? {}
            : { profileId: session.therapistProfileId! },
        );

  rows = sortClientRows(rows, sort, dir);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[#003C79]">Klienci</h1>
      <p className="mb-6 text-sm text-slate-600">
        Lista unikalnych adresów e-mail z agregacją rezerwacji
        {session.role === "THERAPIST" ? " u Ciebie" : ""}. Kliknij nagłówek kolumny,
        aby sortować.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-[#F3FAFC]">
            <tr>
              <ThLink
                label="Imię i nazwisko"
                col="name"
                currentSort={sort}
                currentDir={dir}
              />
              <ThLink label="E-mail" col="email" currentSort={sort} currentDir={dir} />
              <ThLink
                label="Pierwsza rezerwacja"
                col="first"
                currentSort={sort}
                currentDir={dir}
              />
              <ThLink
                label="Ostatnia rezerwacja"
                col="last"
                currentSort={sort}
                currentDir={dir}
              />
              <ThLink
                label="Liczba wizyt"
                col="total"
                currentSort={sort}
                currentDir={dir}
              />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Brak danych o klientach.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.email} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{r.name}</td>
                  <td className="p-3 text-slate-700">{r.email}</td>
                  <td className="p-3 text-slate-600">
                    {format(r.firstBooking, "PPp", { locale: pl })}
                  </td>
                  <td className="p-3 text-slate-600">
                    {format(r.lastBooking, "PPp", { locale: pl })}
                  </td>
                  <td className="p-3 text-slate-800">{r.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
