import { adjustColor } from "./theme";
import { generateColorPresets, type ColorPreset } from "./color-presets";

export type ExtractedColors = {
  primary: string;
  accent: string;
  presets: ColorPreset[];
  baseColor: string;
};

export async function extractColorsFromBuffer(buffer: Buffer): Promise<ExtractedColors> {
  try {
    const sharp = (await import("sharp")).default;
    const { dominant } = await sharp(buffer)
      .resize(64, 64, { fit: "cover" })
      .stats();
    const r = Math.round(dominant.r);
    const g = Math.round(dominant.g);
    const b = Math.round(dominant.b);
    const base = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    const presets = generateColorPresets(base);
    const defaultPreset = presets[0];
    return { primary: defaultPreset.primary, accent: defaultPreset.accent, presets, baseColor: base };
  } catch {
    const presets = generateColorPresets("#C4622D");
    return { primary: presets[0].primary, accent: presets[0].accent, presets, baseColor: "#C4622D" };
  }
}
