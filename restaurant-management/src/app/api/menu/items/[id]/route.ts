import { NextResponse } from "next/server";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { compressDishImage, type ImageAspect } from "@/lib/image-process";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { uploadMenuImage } from "@/lib/supabase";
import { validateImageUpload } from "@/lib/upload-validation";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
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
      const check = validateImageUpload(image);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
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
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  await prisma.menuItem.deleteMany({ where: { id, tenantId: session.tenantId } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
