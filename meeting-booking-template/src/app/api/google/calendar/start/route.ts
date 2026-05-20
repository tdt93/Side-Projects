import { randomBytes } from "crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/calendar/google";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  const { searchParams } = new URL(req.url);
  const qProfile = searchParams.get("profileId")?.trim();

  let profileId: string | undefined;
  if (session.role === "THERAPIST" && session.therapistProfileId) {
    profileId = session.therapistProfileId;
    if (qProfile && qProfile !== profileId) {
      return NextResponse.json({ error: "Nieprawidłowy profil" }, { status: 403 });
    }
  } else if (session.role === "SUPER_ADMIN") {
    if (!qProfile) {
      return NextResponse.json(
        { error: "Brak profileId — wybierz terapeutę na stronie grafiku" },
        { status: 400 },
      );
    }
    profileId = qProfile;
  } else {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google Calendar nie jest skonfigurowany" },
      { status: 503 },
    );
  }

  const nonce = randomBytes(24).toString("hex");
  session.calendarOauthNonce = nonce;
  session.calendarOauthProfileId = profileId;
  await session.save();

  const url = getGoogleAuthUrl(nonce);
  return NextResponse.redirect(url);
}
