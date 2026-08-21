'use strict';
/* One-time image optimizer for ACTIV FITNESS assets */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIRS = [
  path.join(__dirname, '..', 'front end', 'assets', 'images'),
  path.join(__dirname, '..', 'assets', 'images')
];

const PLAN = {
  'prod-': { width: 640, quality: 74 },
  'hero-': { width: 1600, quality: 70 },
  'gym-': { width: 1600, quality: 70 },
  'modern-': { width: 1100, quality: 72 },
  'original-': { width: 1100, quality: 72 },
  'dumbbells.': { width: 1100, quality: 72 },
  'workout-': { width: 1100, quality: 72 }
};
const defaultCfg = { width: 1100, quality: 72 };

async function main() {
  let total = 0, saved = 0;
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f));
    for (const f of files) {
      const cfg = PLAN[Object.keys(PLAN).find(k => f.startsWith(k))] || defaultCfg;
      const file = path.join(dir, f);
      const before = fs.statSync(file).size;
      try {
        let img = sharp(file).rotate();
        const meta = await img.metadata();
        if (meta.width > cfg.width) img = img.resize({ width: cfg.width });
        await img.jpeg({ quality: cfg.quality, mozjpeg: true }).toFile(file + '.tmp');
        fs.renameSync(file + '.tmp', file);
        const after = fs.statSync(file).size;
        total++; saved += before - after;
        console.log(`  ${f.padEnd(34)} ${(before / 1024).toFixed(0).padStart(6)} KB -> ${(after / 1024).toFixed(0).padStart(5)} KB`);
      } catch (e) {
        console.log(`  SKIP ${f}: ${e.message}`);
      }
    }
  }
  console.log(`\nDone: ${total} images optimized, ${(saved / 1024 / 1024).toFixed(1)} MB freed`);
}
main();