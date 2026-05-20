"use client";

import { useEffect, useMemo, useState } from "react";

export function TestimonialCarousel({
  items,
}: {
  items: { id: string; authorName: string; body: string }[];
}) {
  const [i, setI] = useState(0);
  const [desktop, setDesktop] = useState(false);
  if (items.length === 0) return null;
  const visibleCount = desktop ? 2 : 1;

  useEffect(() => {
    const onResize = () => setDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (i >= items.length) {
      setI(0);
    }
  }, [i, items.length]);

  const visibleItems = useMemo(() => {
    const result: { id: string; authorName: string; body: string }[] = [];
    for (let idx = 0; idx < Math.min(visibleCount, items.length); idx += 1) {
      result.push(items[(i + idx) % items.length]!);
    }
    return result;
  }, [i, items, visibleCount]);

  return (
    <div className="flex items-center gap-3 md:gap-5">
      {items.length > 1 && (
        <div className="shrink-0">
          <button
            type="button"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#b9e9f5] bg-white text-4xl font-semibold leading-none text-[#37B3D6] shadow-sm transition hover:border-[#37B3D6] hover:bg-[#F3FAFC]"
            onClick={() => setI((i - 1 + items.length) % items.length)}
            aria-label="Poprzednia opinia"
          >
            &#8249;
          </button>
        </div>
      )}

      <div className={`grid flex-1 gap-4 ${visibleCount === 2 ? "lg:grid-cols-2" : ""}`}>
        {visibleItems.map((t) => (
          <article
            key={t.id}
            className="relative min-h-[180px] rounded-[26px] border border-[#b9e9f5] bg-white p-6 shadow-sm"
          >
            <div className="absolute -left-2 top-8 h-4 w-4 rotate-45 border-b border-l border-[#b9e9f5] bg-white" />
            <p className="text-slate-700">&ldquo;{t.body}&rdquo;</p>
            <p className="mt-4 text-sm font-semibold text-slate-800">{t.authorName}</p>
          </article>
        ))}
      </div>

      {items.length > 1 && (
        <div className="shrink-0">
          <button
            type="button"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#b9e9f5] bg-white text-4xl font-semibold leading-none text-[#37B3D6] shadow-sm transition hover:border-[#37B3D6] hover:bg-[#F3FAFC]"
            onClick={() => setI((i + 1) % items.length)}
            aria-label="Następna opinia"
          >
            &#8250;
          </button>
        </div>
      )}
    </div>
  );
}
