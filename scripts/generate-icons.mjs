import { readFileSync } from "node:fs"
import sharp from "sharp"

const svg = readFileSync("public/icon.svg", "utf-8")

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}x${size}.png`)
  console.log(`Generated icon-${size}x${size}.png`)
}
