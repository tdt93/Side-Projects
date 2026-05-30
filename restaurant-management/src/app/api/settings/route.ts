import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { extractColorsFromBuffer } from "@/lib/theme-server";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session.tenantId || session.staffRole !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const logo = form.get("logo");
    if (logo instanceof File) {
      const buffer = Buffer.from(await logo.arrayBuffer());
      const colors = await extractColorsFromBuffer(buffer);
      const base64 = `data:${logo.type};base64,${buffer.toString("base64")}`;
      await prisma.tenant.update({
        where: { id: session.tenantId },
        data: { logoUrl: base64, primaryColor: colors.primary, accentColor: colors.accent },
      });
    }
    notifyTenantUpdate(session.tenantId);
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();

  if (body.primaryColor || body.accentColor) {
    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        primaryColor: body.primaryColor,
        accentColor: body.accentColor,
      },
    });
  }

  await prisma.restaurantSettings.update({
    where: { tenantId: session.tenantId },
    data: {
      currency: body.currency,
      taxRateBps: body.taxRateBps,
      enabledLanguages: body.enabledLanguages ? JSON.stringify(body.enabledLanguages) : undefined,
      defaultLocale: body.defaultLocale,
      themeMode: body.themeMode,
      menuMode: body.menuMode,
    },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
