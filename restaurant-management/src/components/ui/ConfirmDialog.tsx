"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = true,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  const tCommon = useTranslations("common");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div
        role="alertdialog"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl animate-section-in"
      >
        <div className="mb-3 flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              destructive ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "stat-card-icon"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="interactive flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold">
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`interactive flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${
              destructive ? "bg-red-600 hover:bg-red-700" : "btn-primary"
            }`}
          >
            {confirmLabel ?? tCommon("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
