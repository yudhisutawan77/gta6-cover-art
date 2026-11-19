// Vice Cover Studio — every pixel of the cover is drawn here on a 2D canvas:
// multi-panel poster layouts with slanted white gutters, cover-fit photos with
// per-panel crop, sunset/neon colour grades, original vector sun + palm
// silhouettes, bold poster lettering, grain and vignette. No libraries, no
// network — the same function draws the live preview and the exported PNG.

import { gradeById, inkById, layoutById } from './state.js';

// Deterministic speckles, so the same cover always grains the same way.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const c = tile.getContext('2d');
  const rand = mulberry32(20261119);
  const img = c.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

// ---- panel geometry: each panel is a polygon, so gutters can slant ----
function panelPolygons(layoutId, x, y, w, h) {
  const P = (pts) => pts.map(([px, py]) => [x + px * w, y + py * h]);
  if (layoutId === 'duo-split') {
    return [
      P([[0, 0], [0.54, 0], [0.46, 1], [0, 1]]),
      P([[0.56, 0], [1, 0], [1, 1], [0.48, 1]]),
    ];
  }
  if (layoutId === 'trio-strip') {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const a = i / 3;
      const b = (i + 1) / 3;
      const gap = 0.008;
      out.push(P([
        [a + gap + 0.02, 0], [b - gap + 0.02, 0],
        [b - gap - 0.02, 1], [a + gap - 0.02, 1],
      ]));
    }
    return out;
  }
  if (layoutId === 'full-bleed') {
    return [P([[0, 0], [1, 0], [1, 1], [0, 1]])];
  }
  // vice-five: one hero, two small on the right, two along the bottom.
  return [
    P([[0, 0], [0.66, 0], [0.60, 0.66], [0, 0.66]]),
    P([[0.68, 0], [1, 0], [1, 0.32], [0.63, 0.32]]),
    P([[0.63, 0.34], [1, 0.34], [1, 0.66], [0.58, 0.66]]),
    P([[0, 0.68], [0.56, 0.68], [0.51, 1], [0, 1]]),
    P([[0.58, 0.68], [1, 0.68], [1, 1], [0.53, 1]]),
  ];
}

function polyBounds(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function tracePoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Which panel (if any) holds a point on the cover, in cover pixels.
export function panelAt(state, W, H, px, py) {
  const bandH = state.captionPos === 'band' ? bandHeight(W, H) : 0;
  const polys = panelPolygons(state.layout, 0, 0, W, H - bandH);
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPoly(px, py, polys[i])) return i;
  }
  return -1;
}

function bandHeight(W, H) {
  return Math.round(H * (W >= H ? 0.17 : 0.14));
}

// ---- photo drawing: cover-fit with the panel's own zoom + pan ----
function drawPhotoInto(ctx, img, poly, crop) {
  const box = polyBounds(poly);
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * crop.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  // Pan is clamped so the photo always covers the panel — no white gaps.
  const dx = box.x + (box.w - dw) / 2 + Math.max(-(dw - box.w) / 2, Math.min((dw - box.w) / 2, crop.dx));
  const dy = box.y + (box.h - dh) / 2 + Math.max(-(dh - box.h) / 2, Math.min((dh - box.h) / 2, crop.dy));
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  ctx.filter = 'saturate(1.18) contrast(1.06)';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

function drawPlaceholder(ctx, poly, index) {
  const box = polyBounds(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  const grad = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  grad.addColorStop(0, '#3d1a5e');
  grad.addColorStop(1, '#8b2ff7');
  ctx.fillStyle = grad;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 ${Math.max(14, box.h * 0.07)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${index + 1}`, box.x + box.w / 2, box.y + box.h / 2 - box.h * 0.05);
  ctx.font = `${Math.max(11, box.h * 0.045)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('add a photo', box.x + box.w / 2, box.y + box.h / 2 + box.h * 0.06);
  ctx.restore();
}

// ---- original vector art: a low sun and palm silhouettes ----
function drawSunAndPalms(ctx, poly, grade, W, H) {
  const box = polyBounds(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  // Sun and palms scale with the panel's short side, so a tall narrow
  // panel does not get a giant sun or giant palms.
  const short = Math.min(box.w, box.h);
  const sunR = short * 0.16;
  const sunX = box.x + box.w * 0.80;
  const sunY = box.y + box.h * 0.26;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 1.7);
  glow.addColorStop(0, '#fff3b0');
  glow.addColorStop(0.4, grade.sky);
  glow.addColorStop(1, 'rgba(255,94,122,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sun.addColorStop(0, '#fff8d6');
  sun.addColorStop(0.7, '#ffb347');
  sun.addColorStop(1, '#ff5e7a');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Warm haze under the sun, fading before the panel's foot.
  const horizon = ctx.createLinearGradient(0, sunY + sunR, 0, box.y + box.h * 0.8);
  horizon.addColorStop(0, 'rgba(255,154,61,0.18)');
  horizon.addColorStop(1, 'rgba(255,46,136,0)');
  ctx.fillStyle = horizon;
  ctx.fillRect(box.x, sunY + sunR, box.w, box.y + box.h * 0.8 - sunY - sunR);
  drawPalm(ctx, box.x + box.w * 0.10, box.y + box.h, short * 0.50, -0.10);
  drawPalm(ctx, box.x + box.w * 0.26, box.y + box.h, short * 0.34, 0.08);
  ctx.restore();
}

function drawPalm(ctx, baseX, baseY, size, lean) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(lean);
  ctx.strokeStyle = 'rgba(24,6,38,0.92)';
  ctx.fillStyle = 'rgba(24,6,38,0.92)';
  ctx.lineCap = 'round';
  // Trunk, gently bowed.
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.05, -size * 0.5, size * 0.02, -size * 0.88);
  ctx.stroke();
  const topX = size * 0.02;
  const topY = -size * 0.88;
  // Eight fronds fanning over the crown, each arcing up then drooping down.
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * (1.05 + (i / 7) * 0.9); // sweep across the top
    const len = size * (0.46 - Math.abs(i - 3.5) * 0.03);
    const dirX = Math.cos(a);
    const dirY = Math.sin(a);
    ctx.lineWidth = size * 0.045;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + dirX * len * 0.55,
      topY + dirY * len * 0.45 - len * 0.12,
      topX + dirX * len,
      topY + dirY * len * 0.55 + len * 0.30,
    );
    ctx.stroke();
  }
  // Crown + a couple of coconuts.
  ctx.beginPath();
  ctx.arc(topX, topY, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(topX - size * 0.05, topY + size * 0.06, size * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + size * 0.05, topY + size * 0.06, size * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- colour grade over one panel ----
function gradePanel(ctx, poly, grade, strength) {
  if (strength <= 0) return;
  const box = polyBounds(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  const wash = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalAlpha = strength * 0.55;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.globalAlpha = strength * 0.25;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grade.sky;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

// ---- poster lettering, shrunk until it fits ----
function fitFont(ctx, text, fontFamily, maxSize, maxWidth, weight) {
  let size = maxSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size = Math.floor(size * 0.92);
  }
  return size;
}

function drawCaption(ctx, state, W, H) {
  const ink = inkById(state.ink);
  const grade = gradeById(state.grade);
  const family = '"Vice Display", "Arial Black", sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const paint = (text, cx, cy, size, outlineScale) => {
    ctx.font = `400 ${size}px ${family}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size / outlineScale);
    ctx.strokeStyle = ink.outline;
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = ink.fill;
    ctx.fillText(text, cx, cy);
  };

  if (state.captionPos === 'band') {
    const bh = bandHeight(W, H);
    const bandY = H - bh;
    const band = ctx.createLinearGradient(0, bandY, W, bandY);
    band.addColorStop(0, grade.top);
    band.addColorStop(0.55, grade.bottom);
    band.addColorStop(1, grade.top);
    ctx.fillStyle = '#1d0b2e';
    ctx.fillRect(0, bandY, W, bh);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, W, bh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, bandY, W, Math.max(2, bh * 0.03));
    const titleSize = fitFont(ctx, state.title, family, bh * 0.52, W * 0.94, 400);
    paint(state.title, W / 2, bandY + bh * 0.36, titleSize, 14);
    if (state.subtitle.trim()) {
      ctx.font = `600 ${Math.max(13, bh * 0.17)}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(state.subtitle.toUpperCase(), W / 2, bandY + bh * 0.78);
    }
    return;
  }

  // Title floating over the art: a dark scrim keeps it readable.
  const heroPoly = panelPolygons(state.layout, 0, 0, W, H)[0];
  const hero = polyBounds(heroPoly);
  const cy = state.captionPos === 'top'
    ? H * 0.09
    : hero.y + hero.h * 0.82;
  const size = fitFont(ctx, state.title, family, H * 0.11, W * 0.9, 400);
  ctx.save();
  ctx.shadowColor = 'rgba(10,2,20,0.55)';
  ctx.shadowBlur = size * 0.25;
  ctx.shadowOffsetY = size * 0.05;
  paint(state.title, W / 2, cy, size, 12);
  ctx.restore();
  if (state.subtitle.trim()) {
    ctx.font = `700 ${Math.max(14, H * 0.026)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(10,2,20,0.7)';
    ctx.shadowBlur = 8;
    ctx.fillText(state.subtitle.toUpperCase(), W / 2, cy + size * 0.62);
    ctx.shadowBlur = 0;
  }
}

// ---- the whole cover ----
export function drawCover(ctx, state, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const bandH = state.captionPos === 'band' ? bandHeight(W, H) : 0;
  const polys = panelPolygons(state.layout, 0, 0, W, H - bandH);
  const grade = gradeById(state.grade);

  polys.forEach((poly, i) => {
    const crop = state.crops[i] ?? { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const photo = state.photos[crop.photo];
    if (photo) drawPhotoInto(ctx, photo.img, poly, crop);
    else drawPlaceholder(ctx, poly, i);
    if (state.sun && i === 0 && photo) drawSunAndPalms(ctx, poly, grade, W, H);
    gradePanel(ctx, poly, grade, state.gradeStrength);
  });

  // Thin white frame around the whole poster.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - bandH - ctx.lineWidth / 2);

  drawCaption(ctx, state, W, H);

  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const vig = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.72,
    );
    vig.addColorStop(0, 'rgba(20,5,30,0)');
    vig.addColorStop(1, 'rgba(20,5,30,0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---- export: the same drawing, at a post size, as a PNG blob ----
export function exportCover(state, size) {
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), state, size.w, size.h);
  return new Promise((resolve, reject) => {
    off.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}

export { layoutById };
