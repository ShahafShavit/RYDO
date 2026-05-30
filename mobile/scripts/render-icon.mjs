/**
 * Rasterize resources/icon.svg → resources/icon.png (1024×1024) for @capacitor/assets.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'resources', 'icon.svg');
const pngPath = path.join(root, 'resources', 'icon.png');

const svg = await readFile(svgPath);
await sharp(svg, { density: 384 })
  .resize(1024, 1024)
  .png()
  .toFile(pngPath);

console.log(`Wrote ${pngPath}`);
