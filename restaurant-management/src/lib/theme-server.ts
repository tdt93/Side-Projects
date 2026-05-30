import { adjustColor } from "./theme";

export async function extractColorsFromBuffer(buffer: Buffer) {
  try {
    const sharp = (await import("sharp")).default;
    const { dominant } = await sharp(buffer)
      .resize(64, 64, { fit: "cover" })
      .stats();
    const r = Math.round(dominant.r);
    const g = Math.round(dominant.g);
    const b = Math.round(dominant.b);
    const primary = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    const accent = adjustColor(primary, 40);
    return { primary, accent };
  } catch {
    return { primary: "#C4622D", accent: "#F59E0B" };
  }
}
