import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, type StaffRole } from "@/lib/session";

const schema = z.object({
  role: z.enum(["OWNER", "KITCHEN", "CASHIER"]),
  credential: z.string().min(1),
  locationId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.tenantId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findFirst({
      where: { tenantId: session.tenantId, role: body.role as StaffRole },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid" }, { status: 401 });
    }

    let valid = false;
    if (body.role === "OWNER") {
      valid = await bcrypt.compare(body.credential, user.passwordHash);
    } else if (user.pinHash) {
      valid = await bcrypt.compare(body.credential, user.pinHash);
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid" }, { status: 401 });
    }

    session.staffUserId = user.id;
    session.staffRole = body.role as StaffRole;

    const locations = await prisma.location.findMany({
      where: { tenantId: session.tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (body.role === "OWNER") {
      session.activeLocationId = body.locationId ?? null;
    } else if (body.locationId) {
      session.activeLocationId = body.locationId;
    } else if (locations.length === 1) {
      session.activeLocationId = locations[0].id;
    } else {
      session.activeLocationId = locations[0]?.id ?? null;
    }

    await session.save();

    return NextResponse.json({
      ok: true,
      role: body.role,
      activeLocationId: session.activeLocationId,
      locations: locations.map((l) => ({ id: l.id, name: l.name })),
      needsLocationPick: body.role !== "OWNER" && locations.length > 1 && !body.locationId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
