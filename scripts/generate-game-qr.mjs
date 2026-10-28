import QRCode from 'qrcode';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const pages = ['spell-drill', 'world-map'];
const margin = 4;
const cutoutSize = 9;
const mascot = await sharp(fileURLToPath(new URL('../public/images/dexter-base-character-01.png', import.meta.url)))
  .resize(220, 220, { fit: 'contain', background: '#ffffff' })
  .png()
  .toBuffer();
const mascotData = mascot.toString('base64');

for (const page of pages) {
  const qr = QRCode.create(`https://parcyun.github.io/${page}/`, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const cutoutStart = Math.floor((size - cutoutSize) / 2);
  const dimension = size + margin * 2;
  const modules = [];
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (row >= cutoutStart && row < cutoutStart + cutoutSize && column >= cutoutStart && column < cutoutStart + cutoutSize) continue;
      if (qr.modules.get(row, column)) modules.push(`M${column + margin} ${row + margin}h1v1h-1z`);
    }
  }
  const center = margin + cutoutStart;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 ${dimension} ${dimension}">`
    + `<rect width="${dimension}" height="${dimension}" fill="#fff"/>`
    + `<path fill="#101319" d="${modules.join('')}"/>`
    + `<image x="${center + 0.35}" y="${center + 0.35}" width="${cutoutSize - 0.7}" height="${cutoutSize - 0.7}" href="data:image/png;base64,${mascotData}"/>`
    + '</svg>';
  await writeFile(new URL(`../public/qr/${page}.svg`, import.meta.url), svg);
}
