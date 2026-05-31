import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function POST(req: Request) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const body = z
    .object({ name: z.string().min(1).max(120), address: z.string().max(300), phone: z.string().max(40).optional() })
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
