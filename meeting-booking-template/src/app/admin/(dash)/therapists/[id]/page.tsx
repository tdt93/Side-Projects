import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTherapistProfileAction } from "@/app/actions/therapist";
import { requireSuperAdmin } from "@/lib/admin-auth";
import cities from "@/data/polish-cities.json";
import { prisma } from "@/lib/db";
import { PaymentPolicy } from "@/generated/prisma";

export default async function EditTherapistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const profile = await prisma.therapistProfile.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      testimonials: { orderBy: { sortOrder: "asc" } },
      certificates: { orderBy: { sortOrder: "asc" } },
      sections: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!profile) notFound();

  const actionWithId = updateTherapistProfileAction.bind(null, profile.id);
  const tagsText = profile.tags.map((x) => x.tag.label).join(", ");
  const testimonialsText = profile.testimonials
    .map((t) => `${t.authorName}|${t.body}`)
    .join("\n");
  const certificatesText = profile.certificates
    .map((c) => `${c.imageUrl}|${c.caption ?? ""}`)
    .join("\n");
  const sectionsText = profile.sections
    .map((s) => `${s.heading}\n${s.bodyHtml}`)
    .join("\n---\n");

  return (
    <div>
      <Link href="/admin/therapists" className="text-sm text-blue-700 underline">
        ← Lista
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">Edycja: {profile.displayName}</h1>
      <form action={actionWithId} className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium">Slug URL</label>
          <input
            name="slug"
            required
            defaultValue={profile.slug}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Imię i nazwisko</label>
          <input
            name="displayName"
            required
            defaultValue={profile.displayName}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Tytuł</label>
          <input
            name="title"
            defaultValue={profile.title ?? ""}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Cytat</label>
          <textarea
            name="taglineQuote"
            defaultValue={profile.taglineQuote ?? ""}
            rows={2}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Strefa czasowa</label>
          <input
            name="timezone"
            defaultValue={profile.timezone}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Miasto gabinetu</label>
          <select
            name="officeCity"
            defaultValue={profile.officeCity ?? ""}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Adres (ulica)</label>
          <input
            name="officeAddressLine"
            defaultValue={profile.officeAddressLine ?? ""}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Avatar URL</label>
          <input
            name="avatarUrl"
            defaultValue={profile.avatarUrl ?? ""}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            Obraz sekcji "Dlaczego warto" URL
          </label>
          <input
            name="heroImageUrl"
            defaultValue={profile.heroImageUrl ?? ""}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="/placeholder-why-worth.png"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Bio (HTML)</label>
          <textarea
            name="bioLeadHtml"
            defaultValue={profile.bioLeadHtml ?? ""}
            rows={5}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Recepcja intro (HTML)</label>
          <textarea
            name="receptionIntroHtml"
            defaultValue={profile.receptionIntroHtml ?? ""}
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Tagi specjalizacji</label>
          <textarea
            name="tags"
            defaultValue={tagsText}
            rows={2}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="np. ADHD, Lęki, Depresja"
          />
          <p className="mt-1 text-xs text-slate-500">
            Oddzielaj przecinkiem lub nową linią.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium">Opinie</label>
          <textarea
            name="testimonials"
            defaultValue={testimonialsText}
            rows={6}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Autor|Treść opinii"
          />
          <p className="mt-1 text-xs text-slate-500">Jedna opinia na linię: Autor|Treść</p>
        </div>
        <div>
          <label className="block text-sm font-medium">Certyfikaty</label>
          <textarea
            name="certificates"
            defaultValue={certificatesText}
            rows={4}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://.../certyfikat.jpg|Podpis (opcjonalny)"
          />
          <p className="mt-1 text-xs text-slate-500">
            Jedna pozycja na linię: URL_obrazu|Podpis
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium">Sekcje \"O mnie\" / treści</label>
          <textarea
            name="sections"
            defaultValue={sectionsText}
            rows={10}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
            placeholder={"Nagłówek sekcji\n<p>Treść HTML...</p>\n---\nKolejny nagłówek\n<p>Kolejna treść...</p>"}
          />
          <p className="mt-1 text-xs text-slate-500">
            Każda sekcja: 1. linia to nagłówek, dalsze linie to HTML. Sekcje oddzielaj
            linią <code>---</code>.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium">Polityka płatności (tylko super-admin)</label>
          <select
            name="paymentPolicy"
            defaultValue={profile.paymentPolicy}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={PaymentPolicy.PAY_LATER_IN_PERSON}>
              Płatność później / w gabinecie
            </option>
            <option value={PaymentPolicy.PAY_BEFORE_BOOKING}>
              Płatność przed rezerwacją (Przelewy24)
            </option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">
            Cena sesji online (PLN, np. 200.00)
          </label>
          <input
            name="sessionPricePlnGrosze"
            type="number"
            min={0.01}
            step={0.01}
            defaultValue={
              profile.sessionPricePlnGrosze
                ? (profile.sessionPricePlnGrosze / 100).toFixed(2)
                : ""
            }
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="200.00"
          />
          <p className="mt-1 text-xs text-slate-500">
            Kwota pobierana przez Przelewy24. Domyślna: P24_DEFAULT_PRICE_PLN_GROSZE w .env.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[#37B3D6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          Zapisz
        </button>
      </form>
    </div>
  );
}
