import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-login", 10, 60_000);
  if (limited) return limited;

  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findFirst({
      where: {
        email: body.email.toLowerCase(),
        role: "OWNER",
      },
      include: { tenant: true },
    });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await getSession();
    session.accountId = user.id;
    session.tenantId = user.tenantId;
    session.email = user.email;
    session.tenantName = user.tenant.displayName;
    delete session.staffUserId;
    delete session.staffRole;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
