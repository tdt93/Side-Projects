import { NextResponse } from "next/server";
import { clearStaffSession, getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}

export async function PATCH() {
  const session = await getSession();
  clearStaffSession(session);
  await session.save();
  return NextResponse.json({ ok: true });
}
