import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getRestaurantData } from "@/lib/restaurant-data";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getRestaurantData(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = z
    .object({
      locationId: z.string().nullable(),
    })
    .parse(await req.json());

  if (session.staffRole !== "OWNER" && body.locationId === null) {
    return NextResponse.json({ error: "Staff must select a location" }, { status: 400 });
  }

  session.activeLocationId = body.locationId;
  await session.save();
  notifyTenantUpdate(session.tenantId);

  return NextResponse.json({ ok: true, activeLocationId: session.activeLocationId });
}
