"use client";

import { useMemo, useState, useTransition } from "react";
import { replaceAvailabilityRulesAction } from "@/app/actions/schedule";

const dayLabels = [
  { d: 1, label: "Pn" },
  { d: 2, label: "Wt" },
  { d: 3, label: "Śr" },
  { d: 4, label: "Cz" },
  { d: 5, label: "Pt" },
  { d: 6, label: "So" },
  { d: 0, label: "Nd" },
];

type Rule = { dayOfWeek: number; startTime: string; endTime: string };

export function ScheduleAvailabilityForm({
  profileId,
  initialRules,
}: {
  profileId: string;
  initialRules: Rule[];
}) {
  const initialMap = useMemo(() => {
    const m = new Map<number, { start: string; end: string; on: boolean }>();
    for (const { d } of dayLabels) {
      const r = initialRules.find((x) => x.dayOfWeek === d);
      m.set(d, {
        on: !!r,
        start: r?.startTime ?? "09:00",
        end: r?.endTime ?? "17:00",
      });
    }
    return m;
  }, [initialRules]);

  const [state, setState] = useState(() => initialMap);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateDay(
    d: number,
    patch: Partial<{ on: boolean; start: string; end: string }>,
  ) {
    setState((prev) => {
      const n = new Map(prev);
      const cur = n.get(d)!;
      n.set(d, { ...cur, ...patch });
      return n;
    });
  }

  function save() {
    setMsg(null);
    const rules: Rule[] = [];
    for (const { d } of dayLabels) {
      const x = state.get(d)!;
      if (x.on) rules.push({ dayOfWeek: d, startTime: x.start, endTime: x.end });
    }
    startTransition(async () => {
      try {
        await replaceAvailabilityRulesAction(profileId, rules);
        setMsg("Zapisano grafik.");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Błąd");
      }
    });
  }

  return (
    <div className="space-y-4">
      <table className="w-full max-w-xl text-sm">
        <thead>
          <tr className="text-left text-slate-600">
            <th className="pb-2">Dzień</th>
            <th>Włącz</th>
            <th>Od</th>
            <th>Do</th>
          </tr>
        </thead>
        <tbody>
          {dayLabels.map(({ d, label }) => {
            const x = state.get(d)!;
            return (
              <tr key={d} className="border-t border-slate-100">
                <td className="py-2 font-medium">{label}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={x.on}
                    onChange={(e) => updateDay(d, { on: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    className="w-24 rounded border border-slate-300 px-2 py-1"
                    value={x.start}
                    onChange={(e) => updateDay(d, { start: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="w-24 rounded border border-slate-300 px-2 py-1"
                    value={x.end}
                    onChange={(e) => updateDay(d, { end: e.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Zapisywanie…" : "Zapisz grafik"}
      </button>
      {msg && <p className="text-sm text-green-800">{msg}</p>}
    </div>
  );
}
