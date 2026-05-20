"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { pl } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

type MeetingType = { id: string; label: string; durationMinutes: number };

type Slot = { start: string; end: string };
type DaySlot = Slot & { available: boolean };

export function BookingWidget({
  profileId,
  slug,
  meetingTypes,
  therapistTimezone,
}: {
  profileId: string;
  slug: string;
  meetingTypes: MeetingType[];
  therapistTimezone: string;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [meetingTypeId, setMeetingTypeId] = useState(meetingTypes[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const loadSlots = useCallback(async () => {
    if (!meetingTypeId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/slots?profileId=${profileId}&meetingTypeId=${meetingTypeId}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSlots([]);
        setBookedSlots([]);
        setMessage(
          typeof data.error === "string"
            ? data.error
            : "Nie udało się pobrać terminów (błąd serwera).",
        );
        return;
      }
      setSlots(data.slots ?? []);
      setBookedSlots(data.booked ?? []);
    } catch {
      setMessage("Nie udało się pobrać terminów");
    } finally {
      setLoading(false);
    }
  }, [profileId, meetingTypeId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    const today = new Date();
    if (isSameMonth(today, month)) {
      setSelectedDay(today);
    } else {
      setSelectedDay(startOfMonth(month));
    }
  }, [month]);

  const calendarDays = useMemo(() => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    const start = startOfWeek(ms, { weekStartsOn: 1 });
    const end = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const slotsForSelectedDay = useCallback(
    (day: Date) => {
      const ymd = formatInTimeZone(day, therapistTimezone, "yyyy-MM-dd");
      return slots.filter(
        (s) =>
          formatInTimeZone(new Date(s.start), therapistTimezone, "yyyy-MM-dd") ===
          ymd,
      );
    },
    [slots, therapistTimezone],
  );
  const bookedSlotsForSelectedDay = useCallback(
    (day: Date) => {
      const ymd = formatInTimeZone(day, therapistTimezone, "yyyy-MM-dd");
      return bookedSlots.filter(
        (s) =>
          formatInTimeZone(new Date(s.start), therapistTimezone, "yyyy-MM-dd") ===
          ymd,
      );
    },
    [bookedSlots, therapistTimezone],
  );

  const daySlots = useMemo<DaySlot[]>(() => {
    const map = new Map<string, DaySlot>();
    for (const s of bookedSlotsForSelectedDay(selectedDay)) {
      map.set(s.start, { ...s, available: false });
    }
    for (const s of slotsForSelectedDay(selectedDay)) {
      map.set(s.start, { ...s, available: true });
    }
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
  }, [selectedDay, bookedSlotsForSelectedDay, slotsForSelectedDay]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md transition-all duration-300 hover:shadow-lg sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded px-2 py-1 text-[#37B3D6] hover:bg-[#F3FAFC]"
              onClick={() => setMonth(addMonths(month, -1))}
            >
              ‹
            </button>
            <span className="font-medium capitalize">
              {format(month, "LLLL yyyy", { locale: pl })}
            </span>
            <button
              type="button"
              className="rounded px-2 py-1 text-[#37B3D6] hover:bg-[#F3FAFC]"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
            {calendarDays.map((d) => {
              if (!isSameMonth(d, month)) {
                return <div key={d.toISOString()} className="p-1" />;
              }
              const has =
                slotsForSelectedDay(d).length > 0 ||
                bookedSlotsForSelectedDay(d).length > 0;
              const sel =
                formatInTimeZone(d, therapistTimezone, "yyyy-MM-dd") ===
                formatInTimeZone(selectedDay, therapistTimezone, "yyyy-MM-dd");
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDay(d);
                  }}
                  className={`aspect-square rounded-full p-1 ${
                    sel
                      ? "bg-[#37B3D6] text-white"
                      : has
                        ? "border border-[#37B3D6] text-[#1d4e5f]"
                        : isToday(d)
                          ? "text-blue-600"
                          : "text-slate-700"
                  }`}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 lg:w-48">
          <p className="text-sm font-medium text-slate-600">Godziny</p>
          {loading ? (
            <p className="text-sm text-slate-500">Ładowanie…</p>
          ) : daySlots.length === 0 ? (
            <p className="text-sm text-slate-500">Brak wolnych terminów</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {daySlots.map((s) => {
                return (
                  <button
                    key={s.start}
                    type="button"
                    disabled={!s.available}
                    onClick={() => {
                      if (!s.available) return;
                      router.push(
                        `/book?profileId=${encodeURIComponent(profileId)}&meetingTypeId=${encodeURIComponent(meetingTypeId)}&start=${encodeURIComponent(s.start)}&slug=${encodeURIComponent(slug)}`,
                      );
                    }}
                    className={`rounded-full border px-3 py-2 text-sm ${
                      s.available
                        ? "border-slate-200 hover:border-[#37B3D6] hover:bg-[#F3FAFC]"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    {formatInTimeZone(
                      new Date(s.start),
                      therapistTimezone,
                      "HH:mm",
                    )}{" "}
                    {!s.available ? "• zajęte" : ""}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
        {meetingTypes.map((mt) => (
          <button
            key={mt.id}
            type="button"
            onClick={() => {
              setMeetingTypeId(mt.id);
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              meetingTypeId === mt.id
                ? "border-[#37B3D6] bg-[#37B3D6] text-white"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            {mt.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <p className="text-xs italic text-slate-500">
          * po pierwszej sesji będzie można umówić się z terapeutą na stały termin
          terapii
        </p>
        {message && (
          <p className="text-sm text-[#1d4e5f]" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
