import { updateSiteSettingsAction } from "@/app/actions/therapist";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { footerCompanyFromSettings } from "@/lib/public-footer";
import { WHY_BENEFIT_ICON_KEYS } from "@/components/WhyBenefitIcon";
import {
  serializeMediaLogosLines,
  serializeWhyBenefitsLines,
  sitePublicContentFromSettings,
} from "@/lib/site-public-content";

export default async function SiteSettingsPage() {
  await requireSuperAdmin();
  const s =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }));
  const fc = footerCompanyFromSettings(s);
  const home = sitePublicContentFromSettings(s);
  const stats = [
    home.homeStats[0] ?? { value: "", label: "" },
    home.homeStats[1] ?? { value: "", label: "" },
    home.homeStats[2] ?? { value: "", label: "" },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[#003C79]">Ustawienia strony</h1>
      <p className="mb-6 text-sm text-slate-600">
        Ustawienia wspólne dla całej strony (stopka, liczniki, logotypy, sekcja „Dlaczego”).
      </p>
      <form action={updateSiteSettingsAction} className="max-w-2xl space-y-6">
        <fieldset className="space-y-4 rounded-xl border border-[#b9e9f5] bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-[#003C79]">
            Wygląd strony
          </legend>
          <div>
            <label className="block text-sm font-medium">Favicon (URL obrazka)</label>
            <p className="mt-0.5 text-xs text-slate-500">
              Ikona w karcie przeglądarki. Np. <code className="rounded bg-slate-100 px-1">/icon.png</code>{" "}
              lub pełny adres HTTPS. Puste = domyślny favicon z projektu.
            </p>
            <input
              name="faviconUrl"
              type="url"
              defaultValue={home.faviconUrl ?? ""}
              placeholder="/icon.png"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <legend className="px-1 text-sm font-semibold text-[#003C79]">
            Dane spółki (stopka)
          </legend>
          <div>
            <label className="block text-sm font-medium">Nazwa prawna</label>
            <input
              name="companyLegalName"
              defaultValue={fc.legalName}
              placeholder="np. Trzymsie.pl sp. z o.o."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Adres — linia 1</label>
            <input
              name="companyAddressLine1"
              defaultValue={fc.addressLine1}
              placeholder="ul. …"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Adres — linia 2</label>
            <input
              name="companyAddressLine2"
              defaultValue={fc.addressLine2}
              placeholder="kod i miasto, kraj"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">E-mail recepcji</label>
            <input
              name="companyEmail"
              type="email"
              defaultValue={fc.email}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Rejestry i informacje prawne (NIP, KRS, REGON, kapitał, sąd…)
            </label>
            <textarea
              name="companyRegistryText"
              defaultValue={fc.registryText}
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-xs"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-[#b9e9f5] bg-[#F3FAFC]/50 p-4">
          <legend className="px-1 text-sm font-semibold text-[#003C79]">
            Liczniki (nad sekcją „Dlaczego warto?”)
          </legend>
          <p className="text-xs text-slate-600">
            Trzy pola z liczbą i opisem — wyświetlane na profilach terapeutów.
          </p>
          {[1, 2, 3].map((n) => (
            <div key={n} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Licznik {n} — wartość</label>
                <input
                  name={`stat${n}Value`}
                  defaultValue={stats[n - 1]?.value ?? ""}
                  placeholder="np. 8000+"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Licznik {n} — opis</label>
                <input
                  name={`stat${n}Label`}
                  defaultValue={stats[n - 1]?.label ?? ""}
                  placeholder="np. pacjentów zaufało nam"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-[#b9e9f5] bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-[#003C79]">
            Mówią o nas (slider logotypów)
          </legend>
          <div>
            <label className="block text-sm font-medium">Etykieta sekcji</label>
            <input
              name="mediaPressLabel"
              defaultValue={home.mediaPress.label}
              placeholder="MÓWIĄ O NAS:"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Logotypy (jeden wiersz = jeden logo)</label>
            <p className="mt-0.5 text-xs text-slate-500">
              Format: <code className="rounded bg-slate-100 px-1">URL_obrazka|tekst alt|opcjonalny link</code>
            </p>
            <textarea
              name="mediaLogos"
              defaultValue={serializeMediaLogosLines(home.mediaPress.logos)}
              rows={6}
              placeholder="https://example.com/logo.png|Wprost|https://wprost.pl"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-[#b9e9f5] bg-[#F3FAFC]/50 p-4">
          <legend className="px-1 text-sm font-semibold text-[#003C79]">
            Dlaczego trzymsie.pl? (strona główna)
          </legend>
          <p className="text-xs text-slate-600">
            Sekcja pod listą terapeutów na stronie głównej.
          </p>
          <div>
            <label className="block text-sm font-medium">Tytuł sekcji</label>
            <input
              name="whyTrzymsieTitle"
              defaultValue={home.whyTrzymsie.title}
              placeholder="Dlaczego trzymsie.pl?"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Korzyści (jeden wiersz = jedna karta)</label>
            <p className="mt-0.5 text-xs text-slate-500">
              Format:{" "}
              <code className="rounded bg-slate-100 px-1">ikona_lub_URL|treść</code>. Ikony
              wbudowane: {WHY_BENEFIT_ICON_KEYS.join(", ")} — lub podaj URL obrazka (np.{" "}
              <code className="rounded bg-slate-100 px-1">/media/icon.svg</code>).
            </p>
            <textarea
              name="whyTrzymsieBenefits"
              defaultValue={serializeWhyBenefitsLines(home.whyTrzymsie.benefits)}
              rows={10}
              placeholder="experience|od 14 lat… lub /media/icon.png|treść karty"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-[#003C79]">
            Serwis i rezerwacje
          </legend>
          <div>
            <label className="block text-sm font-medium">Krok slotu (minuty)</label>
            <input
              name="defaultSlotStep"
              type="number"
              defaultValue={s.defaultSlotStep}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Rezerwacja „oczekuje na płatność” — wygaśnie po (min)
            </label>
            <input
              name="pendingHoldMinutes"
              type="number"
              defaultValue={s.pendingHoldMinutes}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

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
