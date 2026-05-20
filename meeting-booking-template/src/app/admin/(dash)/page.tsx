import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function AdminHomePage() {
  const session = await getSession();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Panel administracyjny</h1>
      <p className="mb-6 text-slate-600">
        Zalogowano jako <strong>{session.email}</strong> ({session.role})
      </p>
      <ul className="list-inside list-disc space-y-2 text-blue-700">
        {session.role === "SUPER_ADMIN" && (
          <>
            <li>
              <Link href="/admin/site" className="underline">
                Ustawienia strony i slotów
              </Link>
            </li>
            <li>
              <Link href="/admin/therapists" className="underline">
                Edycja terapeutów (treści, płatności, miasto)
              </Link>
            </li>
            <li>
              <Link href="/admin/bookings" className="underline">
                Wszystkie rezerwacje
              </Link>
            </li>
            <li>
              <Link href="/admin/clients" className="underline">
                Klienci
              </Link>
            </li>
          </>
        )}
        <li>
          <Link href="/admin/schedule" className="underline">
            Grafik i Google Calendar
          </Link>
        </li>
        {session.role === "THERAPIST" && (
          <li>
            <Link href="/admin/clients" className="underline">
              Klienci
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
