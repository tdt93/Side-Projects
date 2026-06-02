"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type AppSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  compact?: boolean;
};

export function AppSelect({ label, compact, className = "", children, ...props }: AppSelectProps) {
  const sizeClass = compact
    ? "py-1.5 pl-2.5 pr-8 text-xs"
    : "py-2.5 pl-3.5 pr-10 text-sm";

  return (
    <label className={`block ${label ? "space-y-1.5" : ""}`}>
      {label && (
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          {...props}
          className={`app-select interactive w-full appearance-none rounded-2xl border border-border bg-card font-medium text-foreground shadow-sm outline-none transition-all duration-200 hover:border-primary/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${sizeClass} ${className}`}
        >
          {children}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${compact ? "right-2 h-3.5 w-3.5" : "right-3 h-4 w-4"}`}
          aria-hidden
        />
      </div>
    </label>
  );
}
