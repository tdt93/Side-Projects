import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sessionRole } from "@/lib/rbac";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email as string | undefined;
    const password = body?.password as string | undefined;
    if (!email || !password) {
      return NextResponse.json(
        { error: "Wymagany email i hasło" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 401 });
    }

    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions,
    );
    session.userId = user.id;
    session.email = user.email;
    session.role = sessionRole(user.role);
    session.therapistProfileId = user.therapistProfileId ?? undefined;
    await session.save();

    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    console.error("[auth/login] failed", error);
    return NextResponse.json(
      {
        error:
          "Błąd konfiguracji sesji. Ustaw SESSION_SECRET (min. 32 znaki) i zrestartuj serwer.",
      },
      { status: 500 },
    );
  }
}
