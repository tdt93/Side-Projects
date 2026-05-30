import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = z
    .object({ name: z.string(), address: z.string(), phone: z.string().optional() })
    .parse(await req.json());

  const loc = await prisma.location.create({
    data: {
      tenantId: session.tenantId,
      name: body.name,
      address: body.address,
      phone: body.phone ?? "",
    },
  });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ id: loc.id });
}
