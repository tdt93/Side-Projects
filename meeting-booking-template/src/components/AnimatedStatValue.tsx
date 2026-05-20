"use client";

import { useEffect, useRef, useState } from "react";
import { parseStatValue } from "@/lib/parse-stat-value";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function AnimatedStatValue({
  value,
  durationMs = 1600,
}: {
  value: string;
  durationMs?: number;
}) {
  const { target, prefix, suffix } = parseStatValue(value);
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (target <= 0) {
      setDisplay(0);
      return;
    }

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      setDisplay(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, target, durationMs]);

  const formatted =
    target > 0
      ? display.toLocaleString("pl-PL")
      : value.trim() || "0";

  return (
    <p
      ref={ref}
      className="text-xl font-bold tracking-tight text-[#003C79] sm:text-2xl md:text-4xl"
    >
      {target > 0 ? (
        <>
          {prefix}
          {formatted}
          {suffix}
        </>
      ) : (
        value
      )}
    </p>
  );
}
