import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

function monthsSince(date: Date) {
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

export async function GET() {
  const session = await getSession();
  if (!session.platformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { locations: true, orders: true, users: true } },
    },
  });

  return NextResponse.json({
    tenants: tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      displayName: t.displayName,
      subscriptionStatus: t.subscriptionStatus,
      subscriptionEndsAt: t.subscriptionEndsAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      subscribedMonths: monthsSince(t.createdAt),
      locationCount: t._count.locations,
      orderCount: t._count.orders,
      userCount: t._count.users,
    })),
  });
}
