// Renders assets/icon.svg into the home screen / install icons in public/.
// Run from Project/: node scripts/build-icons.mjs
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../assets/icon.svg", import.meta.url), "utf8");

// Maskable icons may be cropped to a circle of 80% diameter, so shrink the
// mark (not the background) to keep it inside that safe zone.
const maskable = svg.replace(
  '<g id="mark">',
  '<g id="mark" transform="translate(256 256) scale(0.8) translate(-256 -256)">',
);
if (maskable === svg) throw new Error('assets/icon.svg: <g id="mark"> not found');

// Android draws the notification badge from its alpha channel only, so it
// must be a white silhouette on transparent: no background, plates in white.
const badge = svg
  .replace(/<rect width="512" height="512"[^>]*\/>/, "")
  .replaceAll("#ffd166", "#ffffff")
  .replace('stroke-opacity="0.45"', "");
if (badge.includes('fill="url(#bg)"')) throw new Error("assets/icon.svg: background rect not found");

const outputs = [
  { file: "public/icon.png", size: 192, src: svg },
  { file: "public/icon-512.png", size: 512, src: svg },
  { file: "public/icon-maskable-512.png", size: 512, src: maskable },
  // iOS rounds the corners itself and shows transparency as black: keep it opaque.
  { file: "public/apple-touch-icon.png", size: 180, src: svg },
  { file: "public/badge.png", size: 96, src: badge, transparent: true },
];

for (const { file, size, src, transparent } of outputs) {
  let img = sharp(Buffer.from(src), { density: (72 * size) / 512 * 4 }).resize(size, size);
  if (!transparent) img = img.flatten({ background: "#3b4cca" });
  await img
    .png({ compressionLevel: 9 })
    .toFile(new URL(`../${file}`, import.meta.url).pathname);
  console.log(`${file} ${size}x${size}`);
}
