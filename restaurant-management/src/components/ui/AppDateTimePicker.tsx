"use client";

import { Calendar, Clock } from "lucide-react";
import { useMemo } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTimeValue(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildIso(date: string, time: string) {
  const [y, m, day] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const d = new Date(y!, m! - 1, day, h, min, 0, 0);
  return d.toISOString();
}

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const total = 10 * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 22 || (h === 22 && m > 0)) return null;
  return `${pad(h)}:${pad(m)}`;
}).filter(Boolean) as string[];

type AppDateTimePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  dark?: boolean;
  minDate?: string;
};

export function AppDateTimePicker({ value, onChange, label, dark = false, minDate }: AppDateTimePickerProps) {
  const parsed = value ? new Date(value) : new Date();
  const dateValue = toLocalDateValue(parsed);
  const timeValue = toLocalTimeValue(parsed);

  const shell = dark
    ? "border-white/10 bg-[#120D09] text-[#FAFAF7] placeholder:text-[#6B5B50]"
    : "border-border bg-card text-foreground";

  const slotActive = dark
    ? "border-primary bg-primary/20 text-[#FAFAF7]"
    : "border-primary bg-primary/10 text-primary";
  const slotIdle = dark
    ? "border-white/10 bg-white/5 text-[#A89080] hover:border-white/20 hover:text-[#FAFAF7]"
    : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground";

  const labelClass = dark
    ? "text-[#6B5B50]"
    : "text-muted-foreground";

  const nearbySlots = useMemo(() => TIME_SLOTS, []);

  function updateDate(nextDate: string) {
    onChange(buildIso(nextDate, timeValue));
  }

  function updateTime(nextTime: string) {
    onChange(buildIso(dateValue, nextTime));
  }

  return (
    <div className="space-y-3">
      {label && (
        <span className={`block text-xs font-semibold uppercase tracking-wide ${labelClass}`}>{label}</span>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Calendar className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-[#6B5B50]" : "text-muted-foreground"}`} />
          <input
            type="date"
            value={dateValue}
            min={minDate ?? toLocalDateValue(new Date())}
            onChange={(e) => updateDate(e.target.value)}
            className={`interactive w-full rounded-2xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 ${shell}`}
          />
        </div>
        <div className="relative">
          <Clock className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-[#6B5B50]" : "text-muted-foreground"}`} />
          <input
            type="time"
            step={900}
            value={timeValue}
            onChange={(e) => updateTime(e.target.value)}
            className={`interactive w-full rounded-2xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 ${shell}`}
          />
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {nearbySlots.map((slot) => {
          const active = slot === timeValue;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => updateTime(slot)}
              className={`interactive shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs font-semibold ${active ? slotActive : slotIdle}`}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function addMinutesToIso(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

export function formatReservationRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const dateFmt = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `${dateFmt} · ${startTime} – ${endTime}` : `${start.toLocaleString()} – ${end.toLocaleString()}`;
}
