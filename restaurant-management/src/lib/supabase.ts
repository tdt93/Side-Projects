import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadMenuImage(tenantId: string, itemId: string, buffer: Buffer, mime: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  const path = `${tenantId}/${itemId}.webp`;
  const { error } = await supabase.storage.from("menu-images").upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
  return data.publicUrl;
}
