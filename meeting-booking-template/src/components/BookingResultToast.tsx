"use client";

import { useEffect, useState } from "react";

export function BookingResultToast({
  paid,
  cancelled,
}: {
  paid?: string;
  cancelled?: string;
}) {
  const [visible, setVisible] = useState(Boolean(paid || cancelled));

  useEffect(() => {
    if (!paid && !cancelled) return;
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [paid, cancelled]);

  if (!visible || (!paid && !cancelled)) return null;

  const success = Boolean(paid);
  return (
    <div
      className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      } animate-[fadeout_3s_ease-in-out_forwards]`}
      role="status"
    >
      {success
        ? "Sesja została opłacona i potwierdzona."
        : "Płatność anulowana. Możesz wybrać inny termin."}
    </div>
  );
}
