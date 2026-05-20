import { addDays, addMinutes, isBefore } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { PrismaClient } from "@/generated/prisma";
import { BookingStatus } from "@/generated/prisma";
import { fetchBusyIntervals } from "@/lib/calendar/google";
import { prisma } from "@/lib/db";

function rangesOverlap(
  a0: Date,
  a1: Date,
  b0: Date,
  b1: Date,
): boolean {
  return a0 < b1 && b0 < a1;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

/** JS weekday 0 Sun … 6 Sat for instant in `timeZone`. */
function jsWeekdayInZone(instant: Date, timeZone: string): number {
  const iso = parseInt(formatInTimeZone(instant, timeZone, "i"), 10);
  return iso === 7 ? 0 : iso;
}

export type Slot = { start: string; end: string };

export async function expireStalePendingBookings(
  db: PrismaClient,
  profileId: string,
  holdMinutes: number,
) {
  const cutoff = new Date(Date.now() - holdMinutes * 60 * 1000);
  await db.booking.updateMany({
    where: {
      profileId,
      status: BookingStatus.PENDING_PAYMENT,
      createdAt: { lt: cutoff },
    },
    data: { status: BookingStatus.EXPIRED },
  });
}

export async function getAvailableSlots(opts: {
  profileId: string;
  from: Date;
  to: Date;
  meetingTypeId: string;
  db?: PrismaClient;
}): Promise<Slot[]> {
  const db = opts.db ?? prisma;
  const settings = await db.siteSettings.findFirst();
  const step = settings?.defaultSlotStep ?? 30;
  const holdMinutes = settings?.pendingHoldMinutes ?? 30;

  const profile = await db.therapistProfile.findUnique({
    where: { id: opts.profileId },
    include: {
      rules: true,
      meetingTypes: true,
      calendar: true,
    },
  });
  if (!profile) return [];

  const meeting = profile.meetingTypes.find((m) => m.id === opts.meetingTypeId);
  if (!meeting) return [];

  await expireStalePendingBookings(db, opts.profileId, holdMinutes);

  const duration = meeting.durationMinutes;
  const tz = profile.timezone || "Europe/Warsaw";

  const bookings = await db.booking.findMany({
    where: {
      profileId: opts.profileId,
      start: { lt: opts.to },
      end: { gt: opts.from },
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT],
      },
    },
  });

  let googleBusy: { start: Date; end: Date }[] = [];
  if (
    profile.calendar?.syncPullEnabled &&
    profile.calendar.refreshTokenEnc &&
    process.env.GOOGLE_CLIENT_ID
  ) {
    googleBusy = await fetchBusyIntervals(
      profile.calendar.refreshTokenEnc,
      profile.calendar.calendarId,
      opts.from,
      opts.to,
    );
  }

  const conflictBlocks = [
    ...bookings.map((b) => ({ start: b.start, end: b.end })),
    ...googleBusy,
  ];

  const slots: Slot[] = [];
  const firstCal = formatInTimeZone(opts.from, tz, "yyyy-MM-dd");
  const lastYmd = formatInTimeZone(opts.to, tz, "yyyy-MM-dd");

  for (let d = 0; d < 62; d++) {
    const dayStr = formatInTimeZone(
      addDays(fromZonedTime(`${firstCal}T12:00:00`, tz), d),
      tz,
      "yyyy-MM-dd",
    );
    if (dayStr > lastYmd) break;
    const noonAnchor = fromZonedTime(`${dayStr}T12:00:00`, tz);

    const dow = jsWeekdayInZone(noonAnchor, tz);
    const dayRules = profile.rules.filter((r) => r.dayOfWeek === dow);
    if (dayRules.length === 0) continue;

    for (const rule of dayRules) {
      const openMin = parseTimeToMinutes(rule.startTime);
      const closeMin = parseTimeToMinutes(rule.endTime);
      let t = openMin;
      while (t + duration <= closeMin) {
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        const slotLocalStr = `${dayStr}T${hh}:${mm}:00`;
        const slotStart = fromZonedTime(slotLocalStr, tz);
        const slotEnd = addMinutes(slotStart, duration);

        if (
          !isBefore(slotStart, opts.from) &&
          isBefore(slotStart, opts.to) &&
          !isBefore(slotEnd, opts.from)
        ) {
          const bad = conflictBlocks.some((b) =>
            rangesOverlap(slotStart, slotEnd, b.start, b.end),
          );
          if (!bad) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            });
          }
        }
        t += step;
      }
    }
  }

  return slots;
}
