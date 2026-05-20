import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";

export type ClientRow = {
  email: string;
  name: string;
  firstBooking: Date;
  lastBooking: Date;
  total: number;
};

export type ClientSortKey = "name" | "email" | "first" | "last" | "total";

/** Agregacja po guestEmail: imię z ostatniej wizyty, pierwsza/ostatnia data, liczba rezerwacji. */
export async function getClientRows(
  where: Prisma.BookingWhereInput,
): Promise<ClientRow[]> {
  const bookings = await prisma.booking.findMany({
    where,
    select: {
      guestEmail: true,
      guestName: true,
      start: true,
    },
    orderBy: { start: "asc" },
  });

  const map = new Map<
    string,
    { name: string; first: Date; last: Date; count: number }
  >();

  for (const b of bookings) {
    const key = b.guestEmail;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name: b.guestName,
        first: b.start,
        last: b.start,
        count: 1,
      });
    } else {
      existing.count += 1;
      if (b.start < existing.first) existing.first = b.start;
      if (b.start > existing.last) {
        existing.last = b.start;
        existing.name = b.guestName;
      }
    }
  }

  return [...map.entries()].map(([email, v]) => ({
    email,
    name: v.name,
    firstBooking: v.first,
    lastBooking: v.last,
    total: v.count,
  }));
}

export function sortClientRows(
  rows: ClientRow[],
  sort: ClientSortKey,
  dir: "asc" | "desc",
): ClientRow[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "name":
        return mult * a.name.localeCompare(b.name, "pl", { sensitivity: "base" });
      case "email":
        return mult * a.email.localeCompare(b.email, "pl", {
          sensitivity: "base",
        });
      case "first":
        return mult * (a.firstBooking.getTime() - b.firstBooking.getTime());
      case "last":
        return mult * (a.lastBooking.getTime() - b.lastBooking.getTime());
      case "total":
        return mult * (a.total - b.total);
      default:
        return 0;
    }
  });
}

export function parseClientSort(
  sort: string | undefined,
  dir: string | undefined,
): { sort: ClientSortKey; dir: "asc" | "desc" } {
  const keys: ClientSortKey[] = ["name", "email", "first", "last", "total"];
  const s = keys.includes(sort as ClientSortKey)
    ? (sort as ClientSortKey)
    : "last";
  const d = dir === "asc" ? "asc" : "desc";
  return { sort: s, dir: d };
}

/** Domyślny kierunek przy pierwszym kliknięciu w kolumnę */
export function defaultDirForSort(col: ClientSortKey): "asc" | "desc" {
  return col === "name" || col === "email" ? "asc" : "desc";
}
