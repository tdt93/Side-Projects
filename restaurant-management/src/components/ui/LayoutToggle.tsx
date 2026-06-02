"use client";

import { Grid2X2, LayoutGrid, List } from "lucide-react";

export type LayoutMode = "grid" | "list" | "compact";

type Option = { id: LayoutMode; icon: typeof Grid2X2; label: string };

export function LayoutToggle({
  value,
  onChange,
  options = ["grid", "list"],
  labels,
}: {
  value: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  options?: LayoutMode[];
  labels: { grid: string; list: string; compact?: string };
}) {
  const all: Option[] = [
    { id: "grid", icon: LayoutGrid, label: labels.grid },
    { id: "list", icon: List, label: labels.list },
    { id: "compact", icon: Grid2X2, label: labels.compact ?? labels.grid },
  ];

  const visible = all.filter((o) => options.includes(o.id));

  return (
    <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1">
      {visible.map(({ id, icon: Icon, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`interactive flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
