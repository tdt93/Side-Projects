import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function platformCredentialsValid(email: string, password: string) {
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  return email.toLowerCase() === adminEmail && password === adminPassword;
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "platform-login", 10, 60_000);
  if (limited) return limited;

  try {
    const body = schema.parse(await req.json());
    if (!platformCredentialsValid(body.email, body.password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await getSession();
    session.platformAdmin = true;
    session.email = body.email.toLowerCase();
    delete session.accountId;
    delete session.tenantId;
    delete session.tenantName;
    delete session.staffUserId;
    delete session.staffRole;
    delete session.activeLocationId;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
