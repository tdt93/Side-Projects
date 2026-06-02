import type { TableReservation } from "@prisma/client";

export type ReservationSnapshot = Pick<
  TableReservation,
  "id" | "locationId" | "tableNumber" | "guestName" | "guestPhone" | "startsAt" | "endsAt" | "notes"
>;

export function mapReservation(r: ReservationSnapshot) {
  return {
    id: r.id,
    locationId: r.locationId,
    tableNumber: r.tableNumber,
    guestName: r.guestName,
    guestPhone: r.guestPhone ?? undefined,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    notes: r.notes ?? undefined,
  };
}

export function effectiveTableStatus(
  table: { number: number; currentOrderId: string | null; status: string },
  reservations: ReservationSnapshot[],
  now = new Date(),
): "available" | "occupied" | "reserved" {
  if (table.currentOrderId) return "occupied";
  const active = reservations.some(
    (r) => r.tableNumber === table.number && r.startsAt <= now && r.endsAt > now,
  );
  if (active) return "reserved";
  if (table.status === "OCCUPIED") return "occupied";
  return "available";
}

export function reservationsForTableOnDate(
  reservations: ReservationSnapshot[],
  tableNumber: number,
  date: Date,
) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return reservations
    .filter(
      (r) =>
        r.tableNumber === tableNumber &&
        r.startsAt <= dayEnd &&
        r.endsAt >= dayStart,
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
