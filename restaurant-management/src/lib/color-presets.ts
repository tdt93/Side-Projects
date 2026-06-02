import { adjustColor } from "./theme";

export type ColorPreset = {
  id: string;
  label: string;
  primary: string;
  accent: string;
};

/** Build three brand palettes from an extracted logo color. First preset is the default. */
export function generateColorPresets(basePrimary: string): ColorPreset[] {
  return [
    {
      id: "classic",
      label: "Classic",
      primary: basePrimary,
      accent: adjustColor(basePrimary, 45),
    },
    {
      id: "warm",
      label: "Warm",
      primary: adjustColor(basePrimary, -25),
      accent: adjustColor(basePrimary, 70),
    },
    {
      id: "fresh",
      label: "Fresh",
      primary: adjustColor(basePrimary, 35),
      accent: adjustColor(basePrimary, -35),
    },
  ];
}
