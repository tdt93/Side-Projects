import Link from "next/link";
import { createTherapistAction } from "@/app/actions/therapist";
import { DeleteTherapistButton } from "@/components/DeleteTherapistButton";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import cities from "@/data/polish-cities.json";

export default async function TherapistsAdminPage() {
  await requireSuperAdmin();
  const list = await prisma.therapistProfile.findMany({
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      officeCity: true,
      paymentPolicy: true,
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Terapeuci</h1>
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Dodaj terapeutę</h2>
        <form action={createTherapistAction} className="grid gap-3 md:grid-cols-4">
          <input
            name="displayName"
            required
            placeholder="Imię i nazwisko"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="slug"
            placeholder="slug (opcjonalnie)"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="title"
            placeholder="Tytuł (opcjonalnie)"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="officeCity"
            required
            className="rounded border border-slate-300 px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Wybierz miasto (wymagane)
            </option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="md:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-[#37B3D6] px-4 py-2 text-sm font-semibold text-white"
            >
              Dodaj terapeutę
            </button>
          </div>
        </form>
      </section>
      <ul className="space-y-2">
        {list.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div>
              <span className="font-medium">{t.displayName}</span>
              <span className="ml-2 text-sm text-slate-500">
                {t.officeCity} · {t.paymentPolicy}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/therapists/${t.id}`}
                className="text-sm text-blue-700 underline"
              >
                Edytuj
              </Link>
              <DeleteTherapistButton profileId={t.id} displayName={t.displayName} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
