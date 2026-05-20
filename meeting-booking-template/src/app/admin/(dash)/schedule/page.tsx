import Link from "next/link";
import { ScheduleAvailabilityForm } from "@/components/ScheduleAvailabilityForm";
import { requireLogin } from "@/lib/admin-auth";
import { disconnectCalendarAction } from "@/app/actions/schedule";
import { prisma } from "@/lib/db";

function viewerRole(
  role: "SUPER_ADMIN" | "THERAPIST" | undefined,
): "SUPER_ADMIN" | "THERAPIST" {
  return role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "THERAPIST";
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string; calendar?: string }>;
}) {
  const session = await requireLogin();
  const sp = await searchParams;

  let profileId = session.therapistProfileId ?? "";
  if (session.role === "SUPER_ADMIN") {
    const profiles = await prisma.therapistProfile.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, slug: true },
    });
    profileId = sp.profile ?? profiles[0]?.id ?? "";
    const cal = await prisma.calendarConnection.findUnique({
      where: { profileId },
    });

    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold">Grafik i kalendarz</h1>
        <p className="mb-4 text-sm text-slate-600">
          Jako super-admin wybierz terapeutę:
        </p>
        <ul className="mb-6 flex flex-wrap gap-2">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/schedule?profile=${p.id}`}
                className={`rounded-full px-3 py-1 text-sm ${
                  p.id === profileId
                    ? "bg-blue-700 text-white"
                    : "bg-slate-200 text-slate-800"
                }`}
              >
                {p.displayName}
              </Link>
            </li>
          ))}
        </ul>
        {!profileId ? (
          <p>Brak profili.</p>
        ) : (
          <ScheduleInner
            profileId={profileId}
            cal={cal}
            sp={sp.calendar}
            viewerRole={viewerRole(session.role)}
          />
        )}
      </div>
    );
  }

  if (!profileId) {
    return <p>Brak przypisanego profilu terapeuty.</p>;
  }

  const cal = await prisma.calendarConnection.findUnique({
    where: { profileId },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Grafik i Google Calendar</h1>
      <ScheduleInner
        profileId={profileId}
        cal={cal}
        sp={sp.calendar}
        viewerRole={viewerRole(session.role)}
      />
    </div>
  );
}

async function ScheduleInner({
  profileId,
  cal,
  sp,
  viewerRole,
}: {
  profileId: string;
  cal: { id: string } | null;
  sp?: string;
  viewerRole: "SUPER_ADMIN" | "THERAPIST";
}) {
  const rules = await prisma.availabilityRule.findMany({
    where: { profileId },
    orderBy: { dayOfWeek: "asc" },
  });

  return (
    <>
      {sp === "connected" && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-900">
          Połączono kalendarz Google.
        </p>
      )}
      {sp === "error" && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-900">
          Błąd połączenia — spróbuj ponownie.
        </p>
      )}
      <section className="mb-10 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Dostępność tygodniowa</h2>
        <ScheduleAvailabilityForm
          profileId={profileId}
          initialRules={rules.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
          }))}
        />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Google Calendar</h2>
        <p className="mb-4 text-sm text-slate-600">
          Połączenie pozwala zablokować terminy zajęte w Google oraz opcjonalnie
          dodać wizytę do kalendarza po potwierdzeniu.
        </p>
        {cal ? (
          <form action={disconnectCalendarAction.bind(null, profileId)}>
            <p className="mb-2 text-sm text-green-800">Połączono.</p>
            <button
              type="submit"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              Odłącz
            </button>
          </form>
        ) : (
          <a
            href={
              viewerRole === "SUPER_ADMIN"
                ? `/api/google/calendar/start?profileId=${encodeURIComponent(profileId)}`
                : "/api/google/calendar/start"
            }
            className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
          >
            Połącz Google Calendar
          </a>
        )}
      </section>
    </>
  );
}
