"use client";

import { useCallback, useEffect, useState } from "react";

export function CertificateStrip({
  items,
}: {
  items: { id: string; imageUrl: string; caption: string | null }[];
}) {
  const [i, setI] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") setI((prev) => (prev - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") setI((prev) => (prev + 1) % items.length);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, items.length, closeLightbox]);

  if (items.length === 0) return null;
  const c = items[i]!;

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#b9e9f5] bg-white text-4xl font-semibold leading-none text-[#37B3D6] shadow-sm transition hover:border-[#37B3D6] hover:bg-[#F3FAFC]"
          onClick={() => setI((prev) => (prev - 1 + items.length) % items.length)}
          aria-label="Poprzedni certyfikat"
        >
          &#8249;
        </button>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group flex-1 rounded-2xl border border-[#d8ddff] bg-white p-5 text-center shadow-sm transition hover:border-[#37B3D6] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#37B3D6] focus:ring-offset-2"
          aria-label="Powiększ certyfikat"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.imageUrl}
            alt={c.caption ?? "Certyfikat"}
            className="mx-auto max-h-48 cursor-zoom-in rounded-lg object-contain transition group-hover:opacity-95"
          />
          {c.caption && (
            <p className="mt-2 text-sm text-slate-600">{c.caption}</p>
          )}
          <p className="mt-2 text-xs text-[#37B3D6] opacity-0 transition group-hover:opacity-100">
            Kliknij, aby powiększyć
          </p>
        </button>
        <button
          type="button"
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#b9e9f5] bg-white text-4xl font-semibold leading-none text-[#37B3D6] shadow-sm transition hover:border-[#37B3D6] hover:bg-[#F3FAFC]"
          onClick={() => setI((prev) => (prev + 1) % items.length)}
          aria-label="Następny certyfikat"
        >
          &#8250;
        </button>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Podgląd certyfikatu"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-2xl text-white hover:bg-white/20"
            aria-label="Zamknij"
          >
            ×
          </button>
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setI((prev) => (prev - 1 + items.length) % items.length);
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-3xl text-white hover:bg-white/20 md:left-6"
                aria-label="Poprzedni"
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setI((prev) => (prev + 1) % items.length);
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-3xl text-white hover:bg-white/20 md:right-6"
                aria-label="Następny"
              >
                &#8250;
              </button>
            </>
          )}
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.imageUrl}
              alt={c.caption ?? "Certyfikat"}
              className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            {c.caption && (
              <p className="mt-4 text-center text-sm text-white/90">{c.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
