import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compressDishImage, type ImageAspect } from "@/lib/image-process";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";
import { uploadMenuImage } from "@/lib/supabase";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const item = await prisma.menuItem.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let data: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    if (form.get("name")) data.name = String(form.get("name"));
    if (form.get("category")) data.category = String(form.get("category"));
    if (form.get("priceGrosze")) data.priceGrosze = Number(form.get("priceGrosze"));
    if (form.has("description")) data.description = String(form.get("description"));
    if (form.has("available")) data.available = form.get("available") === "true";
    if (form.has("isCombo")) data.isCombo = form.get("isCombo") === "true";
    if (form.get("imageAspectRatio")) data.imageAspectRatio = String(form.get("imageAspectRatio"));

    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      const aspect = (String(form.get("imageAspectRatio") ?? item.imageAspectRatio) as ImageAspect) || "1:1";
      const buffer = Buffer.from(await image.arrayBuffer());
      const { buffer: compressed, mime } = await compressDishImage(buffer, aspect);
      data.imageUrl = await uploadMenuImage(session.tenantId, id, compressed, mime);
      data.imageAspectRatio = aspect;
    }
  } else {
    const body = await req.json();
    data = {
      name: body.name,
      category: body.category,
      priceGrosze: body.priceGrosze,
      description: body.description,
      available: body.available,
      isCombo: body.isCombo,
      imageAspectRatio: body.imageAspectRatio,
    };
  }

  await prisma.menuItem.update({
    where: { id },
    data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  await prisma.menuItem.deleteMany({ where: { id, tenantId: session.tenantId } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
