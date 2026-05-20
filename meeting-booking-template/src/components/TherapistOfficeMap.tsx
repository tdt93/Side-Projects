export function TherapistOfficeMap({
  officeCity,
  officeAddressLine,
}: {
  officeCity: string | null;
  officeAddressLine: string | null;
}) {
  const parts = [officeAddressLine, officeCity].filter(Boolean);
  if (parts.length === 0) return null;

  const fullAddress = parts.join(", ");
  const mapQuery = encodeURIComponent(fullAddress);
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&hl=pl&z=16&output=embed`;

  return (
    <section id="gabinet-mapa" className="scroll-mt-24 border-t border-slate-100 bg-[#F7F7F7] py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-2 text-2xl font-bold text-[#003C79]">Mapa</h2>
        <p className="mb-6 text-slate-700">
          <strong className="text-[#003C79]">Gabinet:</strong> {fullAddress}
        </p>
        <div className="overflow-hidden rounded-xl border border-[#b9e9f5] bg-white shadow-sm">
          <iframe
            title={`Mapa — ${fullAddress}`}
            src={mapSrc}
            className="h-[min(420px,60vh)] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <p className="mt-3 text-center text-sm">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#37B3D6] hover:underline"
          >
            Otwórz w Google Maps
          </a>
        </p>
      </div>
    </section>
  );
}
