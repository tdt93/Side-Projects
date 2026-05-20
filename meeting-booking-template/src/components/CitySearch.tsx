"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import cities from "@/data/polish-cities.json";

export function CitySearch({ initialCity }: { initialCity?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialCity ?? params.get("city") ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const cityInUrl = params.get("city")?.trim() ?? "";

  const suggestions = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return cities.slice(0, 12);
    return cities.filter((c) => c.toLowerCase().startsWith(t)).slice(0, 12);
  }, [q]);

  function applyCity(city: string) {
    setQ(city);
    setOpen(false);
    router.push(`/?city=${encodeURIComponent(city)}`);
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full max-w-2xl">
      <label className="sr-only" htmlFor="city-search">
        Miasto
      </label>
      <input
        id="city-search"
        className="w-full rounded-xl border border-[#9fd6e5] bg-white px-5 py-3.5 text-slate-800 shadow-md focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
        placeholder="Szukaj po mieście (Polska)…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {suggestions.map((c) => (
            <li key={c}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50"
                onClick={() => applyCity(c)}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
      {cityInUrl ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-[#37B3D6] bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#37B3D6] hover:bg-[#f3fafc]"
            onClick={() => {
              setQ("");
              router.push("/");
            }}
          >
            Pokaż wszystkich
          </button>
        </div>
      ) : null}
    </div>
  );
}
