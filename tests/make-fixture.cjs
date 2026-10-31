// Builds a synthetic stand-in for v0.2.9_3.1_cspx4.lcd, so the patcher can be tested without
// Creality's file. It is pseudo-random filler with every byte the patcher checks or patches set
// to the beta's values, an empty boot-screen region, valid checksums, and a blank Pic 65 (the
// reference script decodes it for a preview). It is not real firmware: never flash it.
const fs = require('fs'), path = require('path');

const SIZE = 4161192, MCU = 0x3F256C, PIC_TBL = 0x054A31;
const SPLASH_OFF = 0x301180, REGION_END = 0x310000, PIC65_DATA = 0x200000;

// Same algorithm as the page and the reference script: CRC-32 (poly 0x04C11DB7), 32 shifts per byte
function crc(buf, start, end) {
  let c = 0xFFFFFFFF;
  for (let i = start; i < end; i++) {
    c = (c ^ buf[i]) >>> 0;
    for (let b = 0; b < 32; b++) c = (c & 0x80000000) ? (((c << 1) ^ 0x04C11DB7) >>> 0) : ((c << 1) >>> 0);
  }
  return c;
}

function makeBase() {
  const b = Buffer.alloc(SIZE);
  let s = 0x9E3779B9;
  for (let i = 0; i < SIZE; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; b[i] = s & 0xFF; }
  b.fill(0, SPLASH_OFF, REGION_END);
  b.writeUInt32LE(MCU, 0x3C);
  b.writeUInt32LE(90, 0x310054);
  b[0x312BDD] = 0x56;
  b.write('_3.1', 0x351852, 'ascii');
  b[MCU + 0x18DE] = 0x5A; b[MCU + 0x18DF] = 0x25;          // MOVS R5,#90
  b[MCU + 0x18F4] = 0x5A; b[MCU + 0x18F5] = 0x2A;          // CMP  R2,#90
  b[MCU + 0x49C0] = 0x00; b[MCU + 0x49C1] = 0x02; b[MCU + 0x49C2] = 0x09;

  // Pic 65: a picture with no blocks (header, 240-row table, 4-byte trailer)
  const tbl = 0x10, ctl = tbl + 240 * 8, pic = Buffer.alloc(ctl + 4);
  pic.writeUInt32LE(tbl + 4, 0);
  for (let y = 0; y < 240; y++) { pic.writeUInt32LE(0x10 + 4, tbl + y * 8); pic.writeUInt32LE(ctl + 4, tbl + y * 8 + 4); }
  pic.writeUInt32LE(1, ctl);
  pic.copy(b, PIC65_DATA);
  b.writeUInt32LE(PIC65_DATA - PIC_TBL, PIC_TBL + 65 * 24 + 4);
  b.writeUInt32LE(pic.length, PIC_TBL + 65 * 24 + 12);

  // checksums, in the same order the patcher recomputes them
  b.writeUInt32LE(crc(b, MCU, SIZE), 0x08);
  b.writeUInt32LE(crc(b, 0x00, 0xC4), 0xC4);
  b.writeUInt32LE(crc(b, 0xC8, 0x18C), 0x18C);
  b.writeUInt32LE((crc(b, 0x00, MCU - 4) ^ b[0x03] ^ b[0x2E] ^ b[0x3C]) >>> 0, MCU - 4);
  return b;
}

module.exports = { makeBase };

if (require.main === module) {
  const out = process.argv[2];
  if (!out) { console.error('Usage: node tests/make-fixture.cjs out.lcd'); process.exit(2); }
  fs.writeFileSync(path.resolve(out), makeBase());
  console.log('wrote ' + out);
}
