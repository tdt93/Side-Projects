"use client";

import { Check } from "lucide-react";
import type { ColorPreset } from "@/lib/color-presets";

export function ColorPresetPicker({
  presets,
  activePrimary,
  activeAccent,
  onSelect,
}: {
  presets: ColorPreset[];
  activePrimary: string;
  activeAccent: string;
  onSelect: (preset: ColorPreset) => void;
}) {
  const isActive = (p: ColorPreset) =>
    p.primary.toLowerCase() === activePrimary.toLowerCase() &&
    p.accent.toLowerCase() === activeAccent.toLowerCase();

  return (
    <div className="grid grid-cols-3 gap-2">
      {presets.map((preset) => {
        const active = isActive(preset);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 ${
              active
                ? "border-primary ring-2 ring-primary/25"
                : "border-border hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            <div className="mb-2 flex gap-1">
              <span
                className="h-6 flex-1 rounded-md shadow-inner"
                style={{ background: preset.primary }}
              />
              <span
                className="h-6 w-6 rounded-md shadow-inner"
                style={{ background: preset.accent }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">{preset.label}</span>
            {active && (
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
