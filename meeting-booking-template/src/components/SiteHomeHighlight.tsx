"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedStatValue } from "@/components/AnimatedStatValue";
import type { HomeStatItem, MediaLogoItem } from "@/lib/site-public-content";

function MediaLogoSlide({ logo }: { logo: MediaLogoItem }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.imageUrl}
      alt={logo.alt ?? ""}
      className="h-10 max-w-[140px] object-contain object-left md:h-12 md:max-w-[180px]"
    />
  );
  if (logo.href) {
    return (
      <a
        href={logo.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center opacity-90 transition hover:opacity-100"
      >
        {img}
      </a>
    );
  }
  return <div className="flex shrink-0 items-center">{img}</div>;
}

export function SiteHomeHighlight({
  stats,
  mediaLabel,
  logos,
}: {
  stats: HomeStatItem[];
  mediaLabel: string;
  logos: MediaLogoItem[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const displayStats = stats.slice(0, 3);
  const loopLogos = logos.length > 0 ? [...logos, ...logos] : [];

  useEffect(() => {
    if (logos.length <= 1 || paused) return;
    const el = trackRef.current;
    if (!el) return;
    let frame: number;
    let x = el.scrollLeft;
    const speed = 0.5;
    const half = el.scrollWidth / 2;

    function tick() {
      if (!el) return;
      x += speed;
      if (x >= half) x = 0;
      el.scrollLeft = x;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [logos.length, paused]);

  return (
    <section className="border-b border-[#b9e9f5]/40 bg-white py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4">
        {displayStats.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {displayStats.map((stat, i) => (
              <div
                key={`${stat.value}-${i}`}
                className="min-w-0 rounded-xl border border-[#d8e8f0] bg-[#F3FAFC] px-2 py-5 text-center shadow-sm sm:px-4 sm:py-6 md:px-6 md:py-8"
              >
                <AnimatedStatValue value={stat.value} />
                <p className="mt-1 text-[10px] font-medium leading-snug text-[#003C79]/90 sm:mt-2 sm:text-xs md:text-base">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {logos.length > 0 && (
          <div
            className={`flex flex-col gap-6 md:flex-row md:items-center ${
              displayStats.length > 0 ? "mt-10" : ""
            }`}
          >
            {mediaLabel && (
              <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500 md:w-32">
                {mediaLabel}
              </p>
            )}
            {logos.length > 0 ? (
              <div
                className="relative min-w-0 flex-1 overflow-hidden"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                <div
                  ref={trackRef}
                  className="flex gap-10 overflow-x-hidden py-2"
                  aria-label="Logotypy mediów"
                >
                  {loopLogos.map((logo, i) => (
                    <MediaLogoSlide key={`${logo.imageUrl}-${i}`} logo={logo} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
