// Icon generator for Gastos expense tracker
// Design: dark bg (#111) with purple accent (#7c6df0), wallet + upward line chart

import sharp from 'sharp';
import { createWriteStream } from 'fs';

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG icon: dark rounded square, stylized coin with up-arrow chart overlay
// Aesthetic: minimal, dark, accent purple — matches app theme
function makeSVG(size) {
  const s = size;
  const r = s * 0.22; // corner radius
  const pad = s * 0.18; // safe area padding for maskable

  // Inner drawing area
  const cx = s / 2;
  const cy = s / 2;

  // Wallet body dimensions
  const ww = s * 0.52;
  const wh = s * 0.38;
  const wx = cx - ww / 2;
  const wy = cy - wh / 2 + s * 0.04;
  const wr = s * 0.07;

  // Flap (top of wallet)
  const flapH = s * 0.10;
  const flapW = ww * 0.55;
  const flapX = wx + (ww - flapW) / 2;
  const flapY = wy - flapH + s * 0.01;
  const flapR = s * 0.05;

  // Coin slot (circle on right side of wallet)
  const coinR = s * 0.085;
  const coinCx = wx + ww - s * 0.10;
  const coinCy = cy + s * 0.04;

  // Upward trend arrow (top-left area)
  const arrowScale = s * 0.0025;
  const arrowX = wx + s * 0.08;
  const arrowY = wy + wh * 0.28;

  // Chart line points (scaled to icon)
  const lw = s * 0.004; // line width

  // Simple upward sparkline
  const pts = [
    [0, 1.0],
    [0.2, 0.7],
    [0.4, 0.8],
    [0.6, 0.4],
    [0.8, 0.2],
    [1.0, 0.0],
  ];
  const lineW = ww * 0.52;
  const lineH = wh * 0.38;
  const lineX = wx + s * 0.08;
  const lineY = wy + wh * 0.52;

  const polyline = pts
    .map(([px, py]) => `${lineX + px * lineW},${lineY + py * lineH - lineH}`)
    .join(' ');

  // Arrow head at end of sparkline
  const lastPt = pts[pts.length - 1];
  const secondLastPt = pts[pts.length - 2];
  const ax = lineX + lastPt[0] * lineW;
  const ay = lineY + lastPt[1] * lineH - lineH;
  const bx = lineX + secondLastPt[0] * lineW;
  const by = lineY + secondLastPt[1] * lineH - lineH;
  const angle = Math.atan2(ay - by, ax - bx);
  const arrowLen = s * 0.065;
  const arrowSpread = 0.4;
  const a1x = ax - arrowLen * Math.cos(angle - arrowSpread);
  const a1y = ay - arrowLen * Math.sin(angle - arrowSpread);
  const a2x = ax - arrowLen * Math.cos(angle + arrowSpread);
  const a2y = ay - arrowLen * Math.sin(angle + arrowSpread);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1730"/>
      <stop offset="100%" stop-color="#0d0b1a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9d8ff5"/>
      <stop offset="100%" stop-color="#7c6df0"/>
    </linearGradient>
    <linearGradient id="wallet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a2550"/>
      <stop offset="100%" stop-color="#1e1b3a"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${s * 0.015}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${r}" ry="${r}" fill="url(#bg)"/>

  <!-- Subtle grid dots for texture -->
  <g opacity="0.06" fill="#7c6df0">
    ${Array.from({length: 5}, (_, row) =>
      Array.from({length: 5}, (_, col) =>
        `<circle cx="${s * 0.15 + col * s * 0.18}" cy="${s * 0.15 + row * s * 0.18}" r="${s * 0.008}"/>`
      ).join('')
    ).join('')}
  </g>

  <!-- Wallet body -->
  <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="${wr}" ry="${wr}"
        fill="url(#wallet)" stroke="#7c6df0" stroke-width="${s * 0.012}" stroke-opacity="0.5"/>

  <!-- Wallet flap -->
  <rect x="${flapX}" y="${flapY}" width="${flapW}" height="${flapH + wr}" rx="${flapR}" ry="${flapR}"
        fill="#252048" stroke="#7c6df0" stroke-width="${s * 0.012}" stroke-opacity="0.4"/>

  <!-- Coin slot circle -->
  <circle cx="${coinCx}" cy="${coinCy}" r="${coinR}"
          fill="#1a1730" stroke="#7c6df0" stroke-width="${s * 0.018}" stroke-opacity="0.7"/>
  <!-- Coin $ symbol -->
  <text x="${coinCx}" y="${coinCy + s * 0.026}"
        font-family="monospace" font-size="${coinR * 0.95}" font-weight="bold"
        fill="#7c6df0" text-anchor="middle" opacity="0.9">$</text>

  <!-- Sparkline (upward trend) with glow -->
  <polyline points="${polyline}"
            fill="none" stroke="#7c6df0" stroke-width="${s * 0.022}"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.3"
            filter="url(#glow)"/>
  <polyline points="${polyline}"
            fill="none" stroke="url(#accent)" stroke-width="${s * 0.018}"
            stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Arrowhead -->
  <polygon points="${ax},${ay} ${a1x},${a1y} ${a2x},${a2y}"
           fill="url(#accent)" opacity="0.9"/>

  <!-- Subtle bottom glow -->
  <ellipse cx="${cx}" cy="${s * 0.92}" rx="${s * 0.35}" ry="${s * 0.06}"
           fill="#7c6df0" opacity="0.12"/>
</svg>`;
}

async function generateIcons() {
  console.log('Generating icons...');

  for (const size of SIZES) {
    const svg = makeSVG(size);
    const outPath = `public/icons/icon-${size}x${size}.png`;

    await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    console.log(`  ✓ ${outPath}`);
  }

  // Also generate favicon.ico sized PNG (32x32) and replace favicon
  const faviconSvg = makeSVG(32);
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .toFile('public/favicon-32.png');
  console.log('  ✓ public/favicon-32.png');

  console.log('\nAll icons generated!');
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
