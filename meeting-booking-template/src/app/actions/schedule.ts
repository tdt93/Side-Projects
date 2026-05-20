"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function replaceAvailabilityRulesAction(
  profileId: string,
  rules: { dayOfWeek: number; startTime: string; endTime: string }[],
) {
  const s = await getSession();
  if (s.role === "SUPER_ADMIN") {
    // ok
  } else if (
    s.role === "THERAPIST" &&
    s.therapistProfileId === profileId
  ) {
    // ok
  } else {
    throw new Error("Forbidden");
  }

  await prisma.$transaction([
    prisma.availabilityRule.deleteMany({ where: { profileId } }),
    prisma.availabilityRule.createMany({
      data: rules.map((r) => ({
        profileId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    }),
  ]);

  const slug = await prisma.therapistProfile.findUnique({
    where: { id: profileId },
    select: { slug: true },
  });
  if (slug) revalidatePath(`/t/${slug.slug}`);
  revalidatePath("/admin/schedule");
}

export async function disconnectCalendarAction(profileId: string) {
  const s = await getSession();
  if (
    s.role !== "SUPER_ADMIN" &&
    !(s.role === "THERAPIST" && s.therapistProfileId === profileId)
  ) {
    throw new Error("Forbidden");
  }
  await prisma.calendarConnection.deleteMany({ where: { profileId } });
  revalidatePath("/admin/schedule");
}

export async function cancelBookingAction(bookingId: string) {
  const s = await getSession();
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { profileId: true },
  });
  if (!b) throw new Error("Not found");
  if (
    s.role !== "SUPER_ADMIN" &&
    !(s.role === "THERAPIST" && s.therapistProfileId === b.profileId)
  ) {
    throw new Error("Forbidden");
  }
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/clients");
}
