// Icon generator: writes the app icon, adaptive foreground and splash mark as PNGs —
// a ring with one slice lifted out, i.e. "part of this income is set aside", drawn in
// the app's own palette. Run from the repo root: node tools/make-icons.cjs
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const GREEN = [22, 163, 74];     // light.primary #16A34A
const AMBER = [245, 158, 11];    // light.accent  #F59E0B
const WHITE = [255, 255, 255];

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function writePNG(file, width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

// ------------------------------------------------------------------- the mark
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
function norm(a) {
  let x = a % TAU;
  if (x < 0) x += TAU;
  return x;
}

// Returns 0 = nothing, 1 = ring (white), 2 = lifted slice (amber)
function markAt(x, y, cx, cy, R, r, lift, wedgeDeg, gapDeg) {
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);
  const a = norm(Math.atan2(dy, dx));
  const half = (wedgeDeg / 2) * DEG;
  const gap = (gapDeg / 2) * DEG;
  const inWedge = a <= half || a >= TAU - half;
  const inGap = a <= half + gap || a >= TAU - half - gap;

  // The lifted slice: same shape, pushed outward, sitting in the gap.
  if (inWedge && d >= r + lift && d <= R + lift) return 2;
  // The ring, with the slice's mouth cut out.
  if (!inGap && d >= r && d <= R) return 1;
  return 0;
}

function render({ size, bg, R, r, lift, wedgeDeg, gapDeg, ss = 4 }) {
  const rgba = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const step = 1 / ss;
  const n = ss * ss;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let white = 0, amber = 0, empty = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const m = markAt(x + (sx + 0.5) * step, y + (sy + 0.5) * step, cx, cy, R, r, lift, wedgeDeg, gapDeg);
          if (m === 1) white++;
          else if (m === 2) amber++;
          else empty++;
        }
      }
      const i = (y * size + x) * 4;
      const ink = white + amber;
      if (bg) {
        // Opaque icon: blend ring, slice and background.
        for (let k = 0; k < 3; k++) {
          rgba[i + k] = Math.round((white * WHITE[k] + amber * AMBER[k] + empty * bg[k]) / n);
        }
        rgba[i + 3] = 255;
      } else {
        // Transparent foreground: colour from the ink, alpha from coverage.
        if (ink === 0) {
          rgba[i + 3] = 0;
        } else {
          for (let k = 0; k < 3; k++) {
            rgba[i + k] = Math.round((white * WHITE[k] + amber * AMBER[k]) / ink);
          }
          rgba[i + 3] = Math.round((ink / n) * 255);
        }
      }
    }
  }
  return rgba;
}

const out = path.join("apps", "mobile", "assets");

// Legacy launcher icon: full-bleed green, generous margin.
writePNG(path.join(out, "icon.png"), 1024, 1024, render({
  size: 1024, bg: GREEN, R: 300, r: 178, lift: 26, wedgeDeg: 56, gapDeg: 7,
}));

// Adaptive foreground: transparent, mark inside the 66% safe zone (radius <= 338).
writePNG(path.join(out, "adaptive-icon.png"), 1024, 1024, render({
  size: 1024, bg: null, R: 268, r: 158, lift: 24, wedgeDeg: 56, gapDeg: 7,
}));

// Splash mark: transparent, drawn a little smaller.
writePNG(path.join(out, "splash-icon.png"), 1024, 1024, render({
  size: 1024, bg: null, R: 300, r: 178, lift: 26, wedgeDeg: 56, gapDeg: 7,
}));

for (const f of ["icon.png", "adaptive-icon.png", "splash-icon.png"]) {
  const p = path.join(out, f);
  console.log(f, fs.statSync(p).size, "bytes");
}
