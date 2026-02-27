import sharp from "sharp"
import { readFileSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const publicDir = resolve(root, "public")

const svgBuffer = readFileSync(resolve(publicDir, "favicon.svg"))

const sizes = [
  { name: "pwa-64x64.png", size: 64 },
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
  { name: "apple-touch-icon-180x180.png", size: 180 },
  { name: "maskable-icon-512x512.png", size: 512 },
]

for (const { name, size } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, name))
  console.log(`Generated ${name}`)
}

console.log("All icons generated successfully.")
