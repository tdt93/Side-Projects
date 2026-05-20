import { requireSuperAdmin } from "@/lib/admin-auth";
import { cancelBookingAction } from "@/app/actions/schedule";
import { prisma } from "@/lib/db";
import { formatInTimeZone } from "date-fns-tz";

export default async function AllBookingsPage() {
  await requireSuperAdmin();
  const rows = await prisma.booking.findMany({
    orderBy: { start: "desc" },
    take: 200,
    include: { profile: { select: { displayName: true, slug: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Wszystkie rezerwacje</h1>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2">Terapeuta</th>
              <th className="p-2">Gość</th>
              <th className="p-2">Email</th>
              <th className="p-2">Start</th>
              <th className="p-2">Status</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-2">{b.profile.displayName}</td>
                <td className="p-2">{b.guestName}</td>
                <td className="p-2">{b.guestEmail}</td>
                <td className="p-2">
                  {formatInTimeZone(b.start, "Europe/Warsaw", "PPpp")}
                </td>
                <td className="p-2">{b.status}</td>
                <td className="p-2">
                  {(b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT") && (
                    <form action={cancelBookingAction.bind(null, b.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-700 underline"
                      >
                        Anuluj
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
