const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateImageUpload(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size <= 0) return { ok: false, error: "Empty file" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File too large (max 5 MB)" };
  }
  const type = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(type)) {
    return { ok: false, error: "Invalid image type" };
  }
  return { ok: true };
}

export async function validateImageBuffer(buffer: Buffer, mime: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File too large (max 5 MB)" };
  }
  if (!ALLOWED_IMAGE_TYPES.has(mime.toLowerCase())) {
    return { ok: false, error: "Invalid image type" };
  }
  return { ok: true };
}
