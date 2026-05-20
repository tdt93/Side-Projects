import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profileId = body?.profileId as string | undefined;
  const name = body?.name as string | undefined;
  const email = body?.email as string | undefined;
  const email2 = body?.emailRepeat as string | undefined;
  const message = body?.message as string | undefined;
  const consent = body?.consent as boolean | undefined;
  const marketingConsent = body?.marketingConsent as boolean | undefined;

  if (!profileId || !name || !email || !message) {
    return NextResponse.json({ error: "Uzupełnij formularz" }, { status: 400 });
  }
  if (email !== email2) {
    return NextResponse.json({ error: "Adresy e-mail muszą być zgodne" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json(
      { error: "Wymagana zgoda na przetwarzanie danych" },
      { status: 400 },
    );
  }

  await prisma.contactMessage.create({
    data: {
      profileId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      body: message.trim(),
    },
  });

  // Optional marketing consent is accepted in API payload and can be persisted
  // once a dedicated DB field is added.
  void marketingConsent;

  return NextResponse.json({ ok: true });
}
