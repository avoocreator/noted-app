// Membuat ikon peluncur dari public/favicon.svg. Butuh `sharp` (npm i -D sharp) — hanya untuk menghasilkan ikon.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
let sharp;
try { sharp = (await import('sharp')).default; } catch { console.error('Pasang dulu: npm i -D sharp'); process.exit(1); }

const svg = readFileSync('public/favicon.svg');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const fg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect x="32" y="28" width="44" height="52" rx="8" fill="#fff"/><path d="M43 55l8 8 15-16" fill="none" stroke="#4F46E5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
for (const [d, px] of Object.entries(sizes)) {
  const dir = join('native', 'android-res', `mipmap-${d}`);
  mkdirSync(dir, { recursive: true });
  await sharp(svg).resize(px, px).png().toFile(join(dir, 'ic_launcher.png'));
  await sharp(svg).resize(px, px).png().toFile(join(dir, 'ic_launcher_round.png'));
  await sharp(fg).resize(Math.round(px * 108 / 48), Math.round(px * 108 / 48)).png().toFile(join(dir, 'ic_launcher_foreground.png'));
}
console.log('Ikon dibuat di native/android-res/');
