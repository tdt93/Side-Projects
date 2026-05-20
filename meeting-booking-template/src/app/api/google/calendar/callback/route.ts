import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/calendar/google";
import { encryptSecret } from "@/lib/token-crypto";
import { prisma } from "@/lib/db";
import { sessionOptions, type SessionData } from "@/lib/session";

const appUrl = () =>
  (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) {
    return NextResponse.redirect(`${appUrl()}/admin/schedule?calendar=error`);
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  const targetProfileId = session.calendarOauthProfileId;
  const okNonce = state && state === session.calendarOauthNonce;
  const roleOk =
    session.role === "SUPER_ADMIN" ||
    (session.role === "THERAPIST" &&
      session.therapistProfileId &&
      targetProfileId === session.therapistProfileId);

  if (!okNonce || !targetProfileId || !roleOk) {
    return NextResponse.redirect(`${appUrl()}/admin/login`);
  }

  session.calendarOauthNonce = undefined;
  session.calendarOauthProfileId = undefined;
  await session.save();

  if (!code) {
    return NextResponse.redirect(`${appUrl()}/admin/schedule?calendar=error`);
  }

  try {
    const refresh = await exchangeCodeForTokens(code);
    const enc = encryptSecret(refresh);
    await prisma.calendarConnection.upsert({
      where: { profileId: targetProfileId },
      create: {
        profileId: targetProfileId,
        refreshTokenEnc: enc,
        provider: "GOOGLE",
      },
      update: {
        refreshTokenEnc: enc,
        provider: "GOOGLE",
        lastSyncAt: new Date(),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${appUrl()}/admin/schedule?calendar=error`);
  }

  return NextResponse.redirect(`${appUrl()}/admin/schedule?calendar=connected`);
}
