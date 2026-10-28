import QRCode from 'qrcode';
import { fileURLToPath } from 'node:url';

const pages = ['spell-drill', 'world-map'];
for (const page of pages) {
  await QRCode.toFile(fileURLToPath(new URL(`../public/qr/${page}.svg`, import.meta.url)), `https://parcyun.github.io/${page}/`, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 480,
    color: { dark: '#101319', light: '#FFFFFFFF' },
  });
}
