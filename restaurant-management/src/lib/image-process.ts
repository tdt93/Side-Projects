import sharp from "sharp";

export type ImageAspect = "1:1" | "3:4";

const DIMENSIONS: Record<ImageAspect, { width: number; height: number }> = {
  "1:1": { width: 512, height: 512 },
  "3:4": { width: 600, height: 800 },
};

export async function compressDishImage(buffer: Buffer, aspect: ImageAspect) {
  const { width, height } = DIMENSIONS[aspect];
  const output = await sharp(buffer)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toBuffer();
  return { buffer: output, mime: "image/webp" as const, width, height };
}
