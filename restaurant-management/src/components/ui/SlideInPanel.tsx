"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function SlideInPanel({ open, title, onClose, children, footer, wide }: Props) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex animate-slide-in-right flex-col border-l border-border bg-card shadow-2xl ${
          wide ? "w-full max-w-lg sm:max-w-xl" : "w-full max-w-md sm:max-w-lg"
        }`}
        role="dialog"
        aria-label={title}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="interactive rounded-lg p-1.5 hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-border bg-card p-4">{footer}</div>}
      </aside>
    </>
  );
}
