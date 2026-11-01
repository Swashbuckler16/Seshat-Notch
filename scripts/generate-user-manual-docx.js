/**
 * Generates a 10-Page, Non-Technical, User-Friendly Manual for Seshat Notch (.docx)
 * Complete with 6 embedded PNG visual diagrams and everyday real-life examples.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ============================================================================
// 1. Minimal ZIP Archive Builder (Deflate + CRC32)
// ============================================================================

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipArchive(files) {
  const localFileParts = [];
  const centralDirParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const uncompressedBuf = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data, 'utf8');
    const crc = crc32(uncompressedBuf);
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf, { level: 9 });

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0, 6);
    lfh.writeUInt16LE(8, 8);
    lfh.writeUInt16LE(0, 10);
    lfh.writeUInt16LE(0, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compressedBuf.length, 18);
    lfh.writeUInt32LE(uncompressedBuf.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);

    localFileParts.push(lfh, nameBuf, compressedBuf);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(8, 10);
    cdh.writeUInt16LE(0, 12);
    cdh.writeUInt16LE(0, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(compressedBuf.length, 20);
    cdh.writeUInt32LE(uncompressedBuf.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(offset, 42);

    centralDirParts.push(cdh, nameBuf);
    offset += lfh.length + nameBuf.length + compressedBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralDirParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localFileParts, centralDirBuf, eocd]);
}

// ============================================================================
// 2. Pure-Node 2D PNG Diagram Renderer (with 5x7 Pixel Font for Crisp Labels)
// ============================================================================

const FONT_5X7 = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00100', '00100', '01000', '10000', '00000'],
  '%': ['11001', '11010', '00100', '00100', '01011', '10011', '00000'],
  '#': ['01010', '11111', '01010', '01010', '11111', '01010', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
  '~': ['00000', '00000', '01101', '10010', '00000', '00000', '00000'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '00100', '00100', '01000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

class PngCanvas {
  constructor(width, height, bg = [250, 247, 238]) {
    this.width = width;
    this.height = height;
    this.raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
      const row = y * (width * 4 + 1);
      this.raw[row] = 0;
      for (let x = 0; x < width; x++) {
        const i = row + 1 + x * 4;
        this.raw[i] = bg[0];
        this.raw[i + 1] = bg[1];
        this.raw[i + 2] = bg[2];
        this.raw[i + 3] = 255;
      }
    }
  }

  setPixel(x, y, color) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= this.width || yi < 0 || yi >= this.height) return;
    const idx = yi * (this.width * 4 + 1) + 1 + xi * 4;
    this.raw[idx] = color[0];
    this.raw[idx + 1] = color[1];
    this.raw[idx + 2] = color[2];
    this.raw[idx + 3] = 255;
  }

  fillRect(x, y, w, h, color, borderColor = null, borderWidth = 1) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        if (
          borderColor &&
          (px < x + borderWidth ||
            px >= x + w - borderWidth ||
            py < y + borderWidth ||
            py >= y + h - borderWidth)
        ) {
          this.setPixel(px, py, borderColor);
        } else {
          this.setPixel(px, py, color);
        }
      }
    }
  }

  drawText(text, x, y, scale = 2, color = [44, 34, 25]) {
    const str = String(text).toUpperCase();
    let cursorX = x;
    for (let c = 0; c < str.length; c++) {
      const ch = str[c];
      const glyph = FONT_5X7[ch] || FONT_5X7[' '];
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (glyph[gy][gx] === '1') {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                this.setPixel(cursorX + gx * scale + sx, y + gy * scale + sy, color);
              }
            }
          }
        }
      }
      cursorX += 6 * scale;
    }
  }

  toBuffer() {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const idat = zlib.deflateSync(this.raw, { level: 9 });
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    return Buffer.concat([
      sig,
      makePngChunk('IHDR', ihdr),
      makePngChunk('IDAT', idat),
      makePngChunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

const COLORS = {
  paper: [250, 247, 238],
  card: [243, 238, 224],
  well: [232, 225, 208],
  border: [210, 200, 182],
  ink: [44, 34, 25],
  muted: [107, 94, 80],
  teal: [13, 148, 136],
  tealSoft: [209, 242, 235],
  amber: [217, 119, 6],
  amberSoft: [254, 243, 199],
  white: [255, 255, 255],
};

// Generate the 6 Visual Illustrations
function buildManualFigures() {
  // Figure 1: Top Navigation Bar (5 Tabs + Quick Add)
  const fig1 = new PngCanvas(760, 170, COLORS.paper);
  fig1.fillRect(4, 4, 752, 162, COLORS.card, COLORS.border, 2);
  fig1.drawText('SESHAT NOTCH  -  5 SIMPLE TABS AT THE TOP', 24, 20, 2, COLORS.teal);
  fig1.fillRect(24, 52, 135, 42, COLORS.teal, COLORS.teal, 2);
  fig1.drawText('1. TODAY', 44, 66, 2, COLORS.white);
  fig1.fillRect(168, 52, 125, 42, COLORS.white, COLORS.border, 2);
  fig1.drawText('2. PLAN', 192, 66, 2, COLORS.ink);
  fig1.fillRect(302, 52, 135, 42, COLORS.white, COLORS.border, 2);
  fig1.drawText('3. HABITS', 318, 66, 2, COLORS.ink);
  fig1.fillRect(446, 52, 150, 42, COLORS.white, COLORS.border, 2);
  fig1.drawText('4. PROGRESS', 456, 66, 2, COLORS.ink);
  fig1.fillRect(605, 52, 130, 42, COLORS.white, COLORS.border, 2);
  fig1.drawText('5. SETTINGS', 612, 66, 2, COLORS.ink);
  fig1.fillRect(24, 110, 711, 38, COLORS.tealSoft, COLORS.teal, 1);
  fig1.drawText('+ QUICK ADD BUTTON (PRESS CTRL+K OR N ANYTIME TO ADD A TASK)', 38, 122, 2, COLORS.ink);

  // Figure 2: Quick Add Shortcut Example
  const fig2 = new PngCanvas(760, 190, COLORS.paper);
  fig2.fillRect(4, 4, 752, 182, COLORS.card, COLORS.border, 2);
  fig2.drawText('QUICK ADD: TYPE ONE SENTENCE, GET AUTOMATIC TAGS', 24, 20, 2, COLORS.teal);
  fig2.fillRect(24, 48, 712, 46, COLORS.white, COLORS.teal, 2);
  fig2.drawText('BUY GROCERIES AND PREP LUNCHES #HOME ~45M !HIGH @TODAY', 38, 64, 2, COLORS.ink);
  fig2.drawText('AUTOMATICALLY RECOGNIZED TAGS:', 24, 110, 2, COLORS.muted);
  fig2.fillRect(24, 134, 155, 34, COLORS.tealSoft, COLORS.teal, 1);
  fig2.drawText('#HOME PROJECT', 36, 144, 2, COLORS.teal);
  fig2.fillRect(192, 134, 165, 34, COLORS.well, COLORS.border, 1);
  fig2.drawText('~45M ESTIMATE', 204, 144, 2, COLORS.ink);
  fig2.fillRect(370, 134, 175, 34, COLORS.amberSoft, COLORS.amber, 1);
  fig2.drawText('!HIGH PRIORITY', 382, 144, 2, COLORS.amber);
  fig2.fillRect(558, 134, 178, 34, COLORS.tealSoft, COLORS.teal, 1);
  fig2.drawText('@TODAY SCHEDULE', 568, 144, 2, COLORS.teal);

  // Figure 3: Today View Dashboard
  const fig3 = new PngCanvas(760, 230, COLORS.paper);
  fig3.fillRect(4, 4, 752, 222, COLORS.card, COLORS.border, 2);
  fig3.drawText('TODAY SCREEN: MORNING SUMMARY + FOCUS TIMER + CHECKLIST', 24, 18, 2, COLORS.teal);
  // Progress cord bar
  fig3.fillRect(24, 44, 712, 36, COLORS.white, COLORS.border, 1);
  fig3.drawText('DAILY PROGRESS: 3 OF 4 DONE (75%)', 36, 55, 2, COLORS.ink);
  fig3.fillRect(450, 52, 260, 18, COLORS.well);
  fig3.fillRect(450, 52, 195, 18, COLORS.teal);
  // Left box: To-Do List
  fig3.fillRect(24, 92, 440, 118, COLORS.white, COLORS.border, 1);
  fig3.drawText('TODAYS TO-DO LIST', 38, 104, 2, COLORS.teal);
  fig3.fillRect(38, 128, 18, 18, COLORS.teal);
  fig3.drawText('WALK 8,000 STEPS OUTDOORS (DONE)', 66, 130, 2, COLORS.muted);
  fig3.fillRect(38, 156, 18, 18, COLORS.teal);
  fig3.drawText('READ 20 PAGES OF BOOK (DONE)', 66, 158, 2, COLORS.muted);
  fig3.fillRect(38, 184, 18, 18, COLORS.white, COLORS.ink, 2);
  fig3.drawText('CALL DENTIST FOR APPOINTMENT', 66, 186, 2, COLORS.ink);
  // Right box: Focus Timer
  fig3.fillRect(478, 92, 258, 118, COLORS.tealSoft, COLORS.teal, 1);
  fig3.drawText('FOCUS TIMER', 494, 104, 2, COLORS.teal);
  fig3.drawText('25:00 MINS', 494, 134, 3, COLORS.ink);
  fig3.fillRect(494, 172, 224, 28, COLORS.teal);
  fig3.drawText('START 25M FOCUS', 516, 179, 2, COLORS.white);

  // Figure 4: Multi-Horizon Cascade (Month -> Week -> Day)
  const fig4 = new PngCanvas(760, 185, COLORS.paper);
  fig4.fillRect(4, 4, 752, 177, COLORS.card, COLORS.border, 2);
  fig4.drawText('CASCADE HELPER: BREAK BIG GOALS INTO SMALL DAILY STEPS', 24, 20, 2, COLORS.teal);
  fig4.fillRect(24, 52, 215, 110, COLORS.white, COLORS.teal, 2);
  fig4.drawText('1. MONTHLY GOAL', 40, 68, 2, COLORS.teal);
  fig4.drawText('READ 300 PAGES', 40, 96, 2, COLORS.ink);
  fig4.drawText('IN NOVEMBER', 40, 120, 2, COLORS.muted);
  fig4.drawText('-->', 248, 98, 2, COLORS.teal);
  fig4.fillRect(290, 52, 215, 110, COLORS.white, COLORS.teal, 2);
  fig4.drawText('2. WEEKLY GOAL', 306, 68, 2, COLORS.teal);
  fig4.drawText('75 PAGES / WEEK', 306, 96, 2, COLORS.ink);
  fig4.drawText('(4 WEEKS)', 306, 120, 2, COLORS.muted);
  fig4.drawText('-->', 514, 98, 2, COLORS.teal);
  fig4.fillRect(556, 52, 180, 110, COLORS.tealSoft, COLORS.teal, 2);
  fig4.drawText('3. DAILY STEP', 572, 68, 2, COLORS.teal);
  fig4.drawText('11 PAGES / DAY', 572, 96, 2, COLORS.ink);
  fig4.drawText('EASY TO DO!', 572, 120, 2, COLORS.teal);

  // Figure 5: Fair Streaks & 7-Day Habit Boxes
  const fig5 = new PngCanvas(760, 185, COLORS.paper);
  fig5.fillRect(4, 4, 752, 177, COLORS.card, COLORS.border, 2);
  fig5.drawText('FAIR STREAKS: REST DAYS & SICK DAYS NEVER RUIN YOUR STREAK', 24, 20, 2, COLORS.teal);
  const days = [
    { d: 'MON', st: 'DONE', bg: COLORS.teal, fg: COLORS.white },
    { d: 'TUE', st: 'DONE', bg: COLORS.teal, fg: COLORS.white },
    { d: 'WED', st: 'SICK', bg: COLORS.amberSoft, fg: COLORS.amber },
    { d: 'THU', st: 'DONE', bg: COLORS.teal, fg: COLORS.white },
    { d: 'FRI', st: 'DONE', bg: COLORS.teal, fg: COLORS.white },
    { d: 'SAT', st: 'REST', bg: COLORS.well, fg: COLORS.muted },
    { d: 'SUN', st: 'DONE', bg: COLORS.teal, fg: COLORS.white },
  ];
  days.forEach((item, idx) => {
    const bx = 24 + idx * 104;
    fig5.fillRect(bx, 54, 92, 74, item.bg, COLORS.border, 1);
    fig5.drawText(item.d, bx + 26, 68, 2, item.fg);
    fig5.drawText(item.st, bx + 20, 96, 2, item.fg);
  });
  fig5.fillRect(24, 138, 712, 32, COLORS.white, COLORS.border, 1);
  fig5.drawText('RESULT: STREAK STAYS INTACT AT 14 DAYS! (NO GUILT FOR SICK OR REST DAYS)', 34, 148, 2, COLORS.ink);

  // Figure 6: Carry-Over Inbox & One-Click Daily Backup
  const fig6 = new PngCanvas(760, 185, COLORS.paper);
  fig6.fillRect(4, 4, 752, 177, COLORS.card, COLORS.border, 2);
  fig6.drawText('UNFINISHED TASKS & ONE-CLICK DAILY BACKUP', 24, 20, 2, COLORS.teal);
  fig6.fillRect(24, 50, 345, 114, COLORS.white, COLORS.border, 1);
  fig6.drawText('CARRY-OVER INBOX (3 CHOICES):', 36, 64, 2, COLORS.teal);
  fig6.drawText('1. MOVE TO TODAY OR TOMORROW', 36, 92, 2, COLORS.ink);
  fig6.drawText('2. SPLIT INTO SMALLER STEPS', 36, 116, 2, COLORS.ink);
  fig6.drawText('3. DROP WITH A SHORT NOTE', 36, 140, 2, COLORS.ink);

  fig6.fillRect(385, 50, 351, 114, COLORS.tealSoft, COLORS.teal, 1);
  fig6.drawText('DAILY BACKUP TO YOUR PC:', 400, 64, 2, COLORS.teal);
  fig6.drawText('SAVES ALL PLANS, HABITS, AND', 400, 92, 2, COLORS.ink);
  fig6.drawText('SETTINGS INTO 1 SAFE FILE.', 400, 114, 2, COLORS.ink);
  fig6.fillRect(400, 132, 260, 24, COLORS.teal);
  fig6.drawText('SAVE BACKUP (.JSON)', 430, 138, 2, COLORS.white);

  return [
    { id: 'rIdImg1', file: 'fig1.png', buf: fig1.toBuffer(), w: 760, h: 170, title: '5 Main Tabs' },
    { id: 'rIdImg2', file: 'fig2.png', buf: fig2.toBuffer(), w: 760, h: 190, title: 'Quick Add Tags' },
    { id: 'rIdImg3', file: 'fig3.png', buf: fig3.toBuffer(), w: 760, h: 230, title: 'Today Screen' },
    { id: 'rIdImg4', file: 'fig4.png', buf: fig4.toBuffer(), w: 760, h: 185, title: 'Cascade Helper' },
    { id: 'rIdImg5', file: 'fig5.png', buf: fig5.toBuffer(), w: 760, h: 185, title: 'Fair Streaks' },
    { id: 'rIdImg6', file: 'fig6.png', buf: fig6.toBuffer(), w: 760, h: 185, title: 'Carry-Over & Backups' },
  ];
}

// ============================================================================
// 3. OpenXML Helpers (Including Inline Image Drawing Helper)
// ============================================================================

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function h1(text) {
  return `<w:p>
    <w:pPr>
      <w:pStyle w:val="Heading1"/>
      <w:spacing w:before="140" w:after="90"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="8" w:space="4" w:color="0D9488"/>
      </w:pBdr>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="1F2937"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr>
      <w:t>${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function h2(text) {
  return `<w:p>
    <w:pPr>
      <w:pStyle w:val="Heading2"/>
      <w:spacing w:before="130" w:after="60"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr>
      <w:t>${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function p(text) {
  return `<w:p>
    <w:pPr><w:spacing w:before="30" w:after="75" w:line="255" w:lineRule="auto"/></w:pPr>
    <w:r>
      <w:rPr><w:color w:val="2C2219"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
      <w:t xml:space="preserve">${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function bullet(leadBold, text) {
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="25" w:after="50" w:line="245" w:lineRule="auto"/>
      <w:ind w:left="340" w:hanging="180"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="20"/></w:rPr>
      <w:t xml:space="preserve">• </w:t>
    </w:r>
    ${
      leadBold
        ? `<w:r><w:rPr><w:b/><w:color w:val="1F2937"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(leadBold)} </w:t></w:r>`
        : ''
    }
    <w:r>
      <w:rPr><w:color w:val="2C2219"/><w:sz w:val="20"/></w:rPr>
      <w:t xml:space="preserve">${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function exampleBox(title, bodyText) {
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="80" w:after="90" w:line="245" w:lineRule="auto"/>
      <w:ind w:left="160" w:right="160"/>
      <w:pBdr>
        <w:left w:val="single" w:sz="18" w:space="8" w:color="0D9488"/>
        <w:top w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/>
        <w:right w:val="single" w:sz="4" w:space="8" w:color="E2DCCD"/>
        <w:bottom w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/>
      </w:pBdr>
      <w:shd w:val="clear" w:color="auto" w:fill="F4EFE2"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="20"/></w:rPr>
      <w:t xml:space="preserve">${esc(title)}: </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:color w:val="2C2219"/><w:sz w:val="19"/></w:rPr>
      <w:t xml:space="preserve">${esc(bodyText)}</w:t>
    </w:r>
  </w:p>`;
}

function embedImage(fig, docPrId) {
  // 6.0 inches wide = 5,486,400 EMUs
  const cx = 5486400;
  const cy = Math.round((cx * fig.h) / fig.w);
  return `<w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="80" w:after="90"/>
    </w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0"
                   xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:docPr id="${docPrId}" name="${esc(fig.title)}"/>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="${docPrId}" name="${esc(fig.file)}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${fig.id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;
}

function table(headers, rows) {
  const headerCells = headers
    .map(
      (h) => `<w:tc>
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="0D9488"/>
        <w:tcMar>
          <w:top w:w="70" w:type="dxa"/>
          <w:bottom w:w="70" w:type="dxa"/>
          <w:left w:w="110" w:type="dxa"/>
          <w:right w:w="110" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:before="15" w:after="15"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr>
          <w:t xml:space="preserve">${esc(h)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`
    )
    .join('');

  const bodyRows = rows
    .map((row, rIdx) => {
      const fill = rIdx % 2 === 1 ? 'F4EFE2' : 'FFFFFF';
      const cells = row
        .map(
          (cell, cIdx) => `<w:tc>
          <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
            <w:tcMar>
              <w:top w:w="65" w:type="dxa"/>
              <w:bottom w:w="65" w:type="dxa"/>
              <w:left w:w="110" w:type="dxa"/>
              <w:right w:w="110" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="15" w:after="15"/></w:pPr>
            <w:r>
              <w:rPr>${cIdx === 0 ? '<w:b/>' : ''}<w:color w:val="2C2219"/><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">${esc(cell)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`
        )
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E6DFD0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E6DFD0"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>${headerCells}</w:tr>
    ${bodyRows}
  </w:tbl>
  <w:p><w:pPr><w:spacing w:before="30" w:after="30"/></w:pPr></w:p>`;
}

// ============================================================================
// 4. Author All 10 User-Friendly Pages with Embedded Figures & Examples
// ============================================================================

const figs = buildManualFigures();

const pages = [
  // --------------------------------------------------------------------------
  // PAGE 1: Welcome to Seshat Notch & Getting Started in 60 Seconds
  // --------------------------------------------------------------------------
  [
    h1('Page 1 — Welcome to Seshat Notch: Your Friendly Daily Planner'),
    exampleBox(
      'What is Seshat Notch?',
      'Seshat Notch is a calm, private daily planner and habit tracker for your Windows laptop or desktop. It helps you organize your big life goals, break them into small daily steps, track your daily habits without guilt, and see your real progress—all while keeping 100% of your information safely on your own computer.'
    ),
    embedImage(figs[0], 101),
    h2('1.1 Why People Love Using Seshat Notch'),
    bullet(
      'Everything in Five Simple Tabs:',
      'You never get lost in complicated menus. Everything lives under five clean buttons at the top of the screen: Today, Plan, Habits, Progress, and Settings.'
    ),
    bullet(
      'Kind to Real Life (No Guilt!):',
      'Other apps ruin your habit streak if you get sick or take a weekend off. Seshat Notch lets you mark rest days, sick days, and vacations so your streak stays safe.'
    ),
    bullet(
      '100% Private & Works Without Internet:',
      'There is no account sign-up, no subscription fee, and no company watching your to-do list. Everything stays right on your Windows PC and works even when Wi-Fi is turned off.'
    ),
    h2('1.2 How to Install It on Your Windows Laptop'),
    table(
      ['Step', 'What to Click', 'What Happens'],
      [
        [
          'Step 1: Open the Link',
          'Open Seshat Notch in Microsoft Edge or Google Chrome on your Windows computer.',
          'The planner loads in your browser and saves its fonts and icons for offline use.'
        ],
        [
          'Step 2: Click "Install App"',
          'Click the small computer-screen icon on the right side of your address bar (or Menu -> Apps -> Install Seshat Notch).',
          'Windows installs Seshat Notch as its own standalone desktop app with an icon in your Start Menu and Taskbar.'
        ],
        [
          'Step 3: Quick Welcome Setup',
          'Type 1 Life Area (like "Health & Fitness"), 1 Project (like "Run a 5K"), and 1 Daily Habit (like "Drink 8 glasses of water").',
          'Your personal planner is ready in 30 seconds! (Or click "Load Example Plan" if you want to explore a pre-made sample first.)'
        ]
      ]
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 2: Finding Your Way Around & The Magic "Quick Add" Bar
  // --------------------------------------------------------------------------
  [
    h1('Page 2 — Navigating the App & Using the "Quick Add" Bar'),
    p(
      'At the very top of Seshat Notch, you will always see the header bar. From here, you can switch between the 5 main screens, start or check a timer, switch between Light and Dark mode, or add a new task in seconds.'
    ),
    h2('2.1 Handy Keyboard Shortcuts (Optional Time-Savers)'),
    p(
      'You can click everything with your mouse, or use these simple keyboard shortcuts when your hands are on the keyboard:'
    ),
    table(
      ['Keys to Press', 'What It Does', 'When to Use It'],
      [
        ['Ctrl + K   (or just press N)', 'Opens the Quick Add box', 'Whenever a new task or idea pops into your head.'],
        ['Alt + 1', 'Jumps to the Today tab', 'To see today’s to-do list, focus timer, and daily habits.'],
        ['Alt + 2', 'Jumps to the Plan tab', 'To organize your life areas, projects, and monthly/weekly goals.'],
        ['Alt + 3', 'Jumps to the Habits tab', 'To check off habits, take a sick/rest day, or view your streaks.'],
        ['Alt + 4', 'Jumps to the Progress tab', 'To see encouraging charts of what you accomplished.'],
        ['Alt + 5', 'Jumps to the Settings tab', 'To save a backup file, change reminders, or recover deleted items.'],
        ['Esc (Escape key)', 'Closes any open pop-up box', 'Whenever you want to close a window without saving.']
      ]
    ),
    h2('2.2 How the "Quick Add" Box Works'),
    p(
      'Click the "Quick Add" button at the top (or press Ctrl+K). You can simply type a task name like "Call Mom" and press Enter—or you can add optional little symbols to automatically set the project, time estimate, priority, and date all in one line!'
    ),
    embedImage(figs[1], 102),
    table(
      ['Symbol', 'Everyday Example', 'What It Means'],
      [
        ['#  (Project)', '#home   or   #fitness', 'Attaches the task to one of your projects (like Home or Fitness).'],
        ['~  (Time needed)', '~30m   or   ~1.5h', 'Estimates how long the task will take (30 minutes or 1.5 hours).'],
        ['!  (Priority)', '!high   or   !urgent   or   !low', 'Marks how important the task is so top priorities stand out.'],
        ['@  (Date)', '@today   or   @tomorrow', 'Puts the task on Today’s list or Tomorrow’s list automatically.'],
        ['+  (Number goal)', '+pages:20   or   +glasses:8', 'Adds a number counter you can tick up as you make progress.']
      ]
    ),
    exampleBox(
      'Real-Life Example',
      'Suppose you want to study Spanish for 30 minutes today. Just press Ctrl+K, type: "Practice Spanish vocabulary ~30m !high @today" and press Enter. Seshat Notch automatically schedules it for Today, marks it High Priority, and sets a 30-minute estimate!'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 3: Tab 1 — The "Today" Screen (Your Daily Home Base)
  // --------------------------------------------------------------------------
  [
    h1('Page 3 — Tab 1: The "Today" Screen (Your Daily Home Base)'),
    p(
      'When you open Seshat Notch each morning, you land on the Today screen. It is designed so you can see everything that matters for today in less than 5 seconds without feeling overwhelmed.'
    ),
    embedImage(figs[2], 103),
    h2('3.1 The Morning Summary Bar (Top of the Screen)'),
    bullet(
      'Date & Day Switcher:',
      'Shows today’s date in large, friendly letters. Use the "<" (Previous Day) and ">" (Next Day) arrows if you forgot to check off something yesterday or want to peek at tomorrow.'
    ),
    bullet(
      'Four Simple Scorecards:',
      'Shows how many Tasks, Goals, and Habits you have completed today, plus how much Focus Time you have logged.'
    ),
    bullet(
      'The Green Progress Cord:',
      'As you check off tasks and habits during the day, this single green bar fills up from 0% to 100%.'
    ),
    h2('3.2 The Built-In Focus Timer & Quick-Log Buttons'),
    p(
      'Right below the summary bar is your Focus Strip. When you want to concentrate without distractions:'
    ),
    bullet(
      'Start a Focus Timer:',
      'Pick a task you are working on, choose a 25-minute or 50-minute block, and click Start. A small timer badge stays visible at the top of the app even if you switch tabs.'
    ),
    bullet(
      'One-Click Quick-Log Buttons:',
      'Forgot to turn on the timer while you were cooking, studying, or working? Just click "+15m", "+25m", "+50m", or "+90m" to record the time you spent with one click.'
    ),
    h2('3.3 Helpful Reminders That Appear When Needed'),
    bullet(
      'Daily Backup Due Banner:',
      'Once a day, a gentle banner reminds you to click "Save backup (.json)" so a fresh copy of your planner is saved to your computer’s Documents/Downloads folder. If you are busy, click "Later" to hide it until tomorrow.'
    ),
    bullet(
      'Sunday Weekly Review Banner:',
      'On Sundays, a friendly card invites you to click "Start Review" so you can celebrate your week’s wins and tidy up any leftover tasks.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 4: Tab 2 — The "Plan" Screen (Life Areas, Projects & Milestones)
  // --------------------------------------------------------------------------
  [
    h1('Page 4 — Tab 2: The "Plan" Screen (Areas, Projects & Steps)'),
    p(
      'Click "Plan" (Alt+2) at the top of the screen when you want to look at the bigger picture. The Plan screen helps you organize your life into clear categories and break big projects into manageable steps.'
    ),
    h2('4.1 Step 1: Create Your "Life Areas" (Left Column)'),
    p(
      'Think of Life Areas as the main buckets of your life that are always ongoing. Most people create 3 to 5 Life Areas:'
    ),
    bullet('Health & Fitness:', 'Exercise, sleep, nutrition, doctor visits.'),
    bullet('Home & Family:', 'Home organization, family trips, chores, errands.'),
    bullet('Career & Study:', 'Work projects, learning a new skill, reading, exams.'),
    bullet('Personal Finances:', 'Budgeting, saving for a trip, paying off bills.'),
    h2('4.2 Step 2: Create a "Project" Inside a Life Area'),
    p(
      'While a Life Area goes on forever, a Project has a clear finish line! When you click "+ New Project", Seshat Notch asks you a few helpful questions:'
    ),
    table(
      ['Box on Screen', 'Everyday Example ("Renovate the Kitchen")', 'Why It Helps You'],
      [
        ['Project Title', 'Organize & Paint the Home Office', 'Gives your project a clear, motivating name.'],
        ['Why This Matters', 'So I have a calm, clutter-free desk to work and read.', 'Reminds you why you started when motivation dips!'],
        ['Success Criteria (Done When)', 'Desk assembled, walls painted, and old cables donated.', 'Makes it 100% clear when the project is officially finished.'],
        ['Start Date & Target End Date', 'Nov 1 to Nov 30', 'Lets Seshat Notch tell you if you are On Track or falling behind.'],
        ['Project Status', 'Active, Paused, Completed, or Dropped', 'Putting a project on "Paused" freezes its schedule so you aren’t penalized while taking a break.']
      ]
    ),
    h2('4.3 Step 3: Break Your Project into "Milestones" (Phases)'),
    p(
      'A big project feels scary until you slice it into 3 or 4 smaller phases (called Milestones). For example, for "Plan Family Summer Trip", your Milestones might be:'
    ),
    bullet('Milestone 1:', 'Pick dates and book flights (Weight: 25%)'),
    bullet('Milestone 2:', 'Reserve family hotel and rental car (Weight: 25%)'),
    bullet('Milestone 3:', 'Make packing list and pet-sitter plan (Weight: 50%)'),
    exampleBox(
      'What If Something Blocks Your Progress?',
      'Waiting on a contractor or waiting for a package to arrive? Click "Add Blocker" on the project. Seshat Notch records how many days you were waiting on someone else so you know why a project took longer.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 5: Tab 2 (Cont.) — Monthly, Weekly & Daily Goals ("Cascade" Helper)
  // --------------------------------------------------------------------------
  [
    h1('Page 5 — Breaking Big Monthly Goals into Weekly & Daily Steps'),
    p(
      'Inside the "Plan" tab, click the second button at the top labeled "Monthly, Weekly & Daily Targets". This screen solves one of the biggest problems in planning: setting a big monthly goal and forgetting about it until the 29th of the month!'
    ),
    embedImage(figs[3], 104),
    h2('5.1 How the Three Time Horizons Work Together'),
    table(
      ['Time Horizon', 'Everyday Example', 'How You Use It'],
      [
        [
          'Monthly Goal',
          'Read 300 pages in November  (or Walk 120 miles this month)',
          'Set 1 to 3 big measurable goals at the start of the month.'
        ],
        [
          'Weekly Goal',
          'Read 75 pages this week  (or Walk 30 miles this week)',
          'Keeps your focus on what needs to happen between Monday and Sunday. Shows up right on your Today screen!'
        ],
        [
          'Daily Target',
          'Read 11 pages today  (or Walk 4.5 miles today)',
          'Small, bite-sized numbers you can easily finish in a single day.'
        ]
      ]
    ),
    h2('5.2 The Magic "Cascade" Button (Automatic Goal Splitter)'),
    p(
      'You don’t need a calculator to divide your monthly goals into weekly or daily goals! Here is how the Cascade button does the math for you:'
    ),
    bullet(
      'Step 1:',
      'Create a Monthly Goal—for example, "Save $400 for Holiday Gifts in November".'
    ),
    bullet(
      'Step 2:',
      'Click the "Cascade" button next to that Monthly Goal.'
    ),
    bullet(
      'Step 3:',
      'Seshat Notch automatically splits that $400 goal into four Weekly Goals of $100 each! You can even cascade a Weekly Goal into 7 Daily Goals (or 5 Weekday-only Goals) with one more click.'
    ),
    exampleBox(
      'What If You Don’t Finish a Goal This Week?',
      'Life happens! At the end of the week, click the "Copy Unfinished Forward" button. Seshat Notch gently carries the remaining amount into next week so you can keep going without starting over.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 6: Tab 3 — The "Habits" Screen & Fair Streaks (No More Guilt!)
  // --------------------------------------------------------------------------
  [
    h1('Page 6 — Tab 3: Habits & "Fair Streaks" (Consistency Without Guilt)'),
    p(
      'Click "Habits" (Alt+3) to build healthy daily routines or break unwanted habits. Most habit apps punish you: if you build a 30-day streak and catch a cold for one day, they reset your streak to 0. Seshat Notch uses "Fair Streaks" instead.'
    ),
    embedImage(figs[4], 105),
    h2('6.1 Choose a Schedule That Fits Your Real Life'),
    bullet(
      'Every Day:',
      'Great for daily essentials like "Drink 8 glasses of water" or "Take morning vitamins".'
    ),
    bullet(
      'Weekdays Only (Mon–Fri):',
      'Great for work or study habits like "Clear email inbox by 5 PM". Saturday and Sunday are automatically marked as Rest Days—they never break your streak!'
    ),
    bullet(
      'Specific Days (e.g., Mon, Wed, Fri):',
      'Great for workouts like "30-minute strength training". Tuesday, Thursday, and weekends are automatic Rest Days.'
    ),
    bullet(
      'X Times Per Week (e.g., 3 times a week):',
      'Do it on any 3 days you choose between Monday and Sunday to keep your streak alive!'
    ),
    h2('6.2 How to Take an "Excused Skip" or a "Vacation Pause"'),
    table(
      ['Situation', 'Which Button to Click on Your Habit', 'What Happens to Your Streak'],
      [
        [
          'You are sick, exhausted, or had a family emergency today',
          'Click "Skip / Excuse Today" and type a short note like "Down with flu".',
          'Today is marked as an Excused Skip (◆). Your streak does NOT reset to zero—it freezes safely until tomorrow!'
        ],
        [
          'You are going on a 1-week trip or taking a break',
          'Click "Pause Habit" and pick your start and end dates.',
          'All days during your trip are paused. When you return, your streak picks up right where you left off.'
        ]
      ]
    ),
    h2('6.3 Building Good Habits vs. Quitting Bad Habits'),
    bullet(
      'Build a Good Habit:',
      'Click the daily check-in box when you complete your habit (like "Read 15 minutes").'
    ),
    bullet(
      'Quit an Unwanted Habit (Avoidance Habit):',
      'Want to quit "Late-night sugary snacks" or "Mindless phone scrolling"? Turn on the "Avoidance Habit" switch when creating the habit. Seshat Notch counts your "Days Clean" automatically, and if you slip up, lets you log what triggered it so you can learn and start fresh.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 7: Tab 4 — The "Progress" Screen (Charts Anyone Can Understand)
  // --------------------------------------------------------------------------
  [
    h1('Page 7 — Tab 4: The "Progress" Screen (Visual Charts & Health)'),
    p(
      'Click "Progress" (Alt+4) whenever you want to see how far you have come. All 7 views are lined up clearly across the top of the Progress screen so nothing is hidden.'
    ),
    h2('7.1 What Each of the 7 Progress Views Shows You'),
    table(
      ['View Button', 'What You Will See in Plain English', 'Best Question It Answers'],
      [
        [
          '1. Overview',
          '4 big summary scorecards, a list of your active projects, and a horizontal color bar showing how you spent your focus time.',
          '"How am I doing overall this month?"'
        ],
        [
          '2. Projects',
          'Progress bars for each project with a marker showing where you planned to be by today.',
          '"Are my projects On Track (●), At Risk (▲), or Behind (■)?"'
        ],
        [
          '3. Habits',
          'Your habit consistency percentages, best streaks, and full-year calendar grids.',
          '"Which habits am I sticking to best?"'
        ],
        [
          '4. Activity',
          'A line chart of tasks completed over time and how close your time estimates were to reality.',
          '"Do tasks usually take me longer than I think?"'
        ],
        [
          '5. Goals',
          'Progress bars for all your Monthly, Weekly, and Daily number targets.',
          '"How close am I to hitting my weekly and monthly numbers?"'
        ],
        [
          '6. Reviews',
          'Your Carry-Over Inbox for unfinished tasks, plus Daily, Weekly, and Monthly reflection journals.',
          '"What did I accomplish this week, and what rolled over?"'
        ],
        [
          '7. Insights',
          'Smart observations about your most productive day of the week (appears once you have 14+ active days of data).',
          '"Which day of the week do I get the most done?"'
        ]
      ]
    ),
    h2('7.2 The "?" Button: No Mystery Numbers!'),
    exampleBox(
      'Tap the "?" Icon on Any Scorecard',
      'Have you ever wondered how an app calculated a percentage? In Seshat Notch, every big number has a small "?" button in its corner. Click it, and a friendly pop-up box explains in plain English how the number was calculated using your own tasks and habits!'
    ),
    h2('7.3 Why "Insights" Waits Until You Have 14 Days of Activity'),
    p(
      'If you only used the app for two days, it would be silly for the app to claim "Saturday is your most productive day!" Seshat Notch waits until you have logged tasks on at least 14 days before showing patterns—and shows a clear counter ("3 of 14 active days recorded") until then.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 8: Handling Unfinished Tasks (Carry-Over Inbox) & Weekly Reviews
  // --------------------------------------------------------------------------
  [
    h1('Page 8 — Unfinished Tasks (Carry-Over Inbox) & Weekly Reviews'),
    p(
      'Even with the best intentions, we all have days where 2 or 3 tasks on our to-do list don’t get done. In Seshat Notch, unfinished tasks from yesterday never disappear into a black hole—they go into your Carry-Over Inbox.'
    ),
    embedImage(figs[5], 106),
    h2('8.1 Three Stress-Free Ways to Clear Unfinished Tasks'),
    p(
      'Open Progress -> Reviews (or click the Sunday Review banner on Today) to see your Carry-Over Inbox. For each leftover task from a past day, you have three simple buttons:'
    ),
    bullet(
      'Choice 1 — Reschedule It (Move to Today or Tomorrow):',
      'Still need to do it? Click "Today", "Tomorrow", or pick a date next week. The task moves cleanly to your new day.'
    ),
    bullet(
      'Choice 2 — Split It into Smaller Pieces:',
      'Sometimes we procrastinate on a task because it is too big (like "Clean the entire garage"). Click "Split", and break it into two smaller tasks (like "Sort tool shelf - 20m" and "Sweep garage floor - 15m").'
    ),
    bullet(
      'Choice 3 — Drop It (With a Short Note):',
      'Realized you no longer need to do it? Click "Drop" and jot down a quick reason (like "Already handled by phone"). It is taken off your plate without guilt!'
    ),
    h2('8.2 Doing a 5-Minute Sunday Weekly Review'),
    p(
      'Every Sunday, Seshat Notch makes it easy to close out your week and start Monday feeling calm and organized:'
    ),
    table(
      ['Review Step', 'What Seshat Notch Shows You', 'What You Write (1–2 Sentences)'],
      [
        ['1. Automatic Summary', 'Automatically counts how many tasks you finished, hours you focused, and habits you checked off this week.', 'Nothing to calculate—it is filled in for you automatically!'],
        ['2. Highlights & Wins', 'A box for your favorite moments of the week.', 'Example: "Walked 4 times this week and finished painting the office."'],
        ['3. What Got in the Way', 'A box for any obstacles or lessons learned.', 'Example: "Stayed up too late on Wednesday; need to start reading by 9:30 PM."'],
        ['4. Energy & Mood', 'Simple 1-to-5 rating buttons for how energized you felt.', 'Click a number from 1 (exhausted) to 5 (great energy) and click Save Review!']
      ]
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 9: Tab 5 — "Settings" (Backups, Night-Owl Hours, Reminders & Trash)
  // --------------------------------------------------------------------------
  [
    h1('Page 9 — Tab 5: Settings (Backups, Night-Owl Hours & Reminders)'),
    p(
      'Click "Settings" (Alt+5) in the top right corner whenever you want to save a backup copy of your data, bring back a deleted item, adjust late-night hours, or set up daily reminders.'
    ),
    h2('9.1 The 5 Sections Inside Settings'),
    table(
      ['Settings Sub-Tab', 'What You Can Do Here', 'When You Will Use It'],
      [
        [
          '1. Export Data',
          'Download all your data as a Backup file (.json), a Spreadsheet (.csv for Excel), or a Printable Document (.md).',
          'When you want a spreadsheet of your hours or a printable list of your goals.'
        ],
        [
          '2. Import Plans',
          'Restore a saved backup file, paste a simple checklist of tasks, or load the sample project.',
          'When moving to a new computer or pasting a big list of tasks at once.'
        ],
        [
          '3. Recovery Bin (Trash)',
          'See every task, project, or habit you deleted and restore it with one click.',
          'Whenever you accidentally delete a task or project and want it back!'
        ],
        [
          '4. Backups & Snapshots',
          'Click "Save Backup to File" to save a .json copy to your PC, or restore an automatic safety snapshot.',
          'Once a day (or week) to keep a safe copy of your planner on your computer.'
        ],
        [
          '5. Privacy & Preferences',
          'Set your Night-Owl Day Rollover hour, turn on Morning/Evening reminders, or set an optional PIN lock.',
          'When customizing the app for your personal schedule.'
        ]
      ]
    ),
    h2('9.2 Night-Owl Setting: "When Does Your Day End?"'),
    exampleBox(
      'Do You Ever Stay Up Past Midnight?',
      'If you finish a task at 1:30 AM on Monday night, most apps count it as Tuesday! In Settings -> Privacy & Preferences, look for "Local Day Rollover Boundary". You can set your new day to start at 1:00 AM, 2:00 AM, 3:00 AM, 4:00 AM, or 5:00 AM so late-night check-ins still count for "Today".'
    ),
    h2('9.3 Setting Up Daily Reminders & PIN Lock'),
    bullet(
      'Morning & Evening Reminders:',
      'Turn on the "Reminders" checkbox and pick a Morning time (like 09:00 AM) and Evening time (like 08:00 PM). When Seshat Notch is open on your computer (or minimized to the Windows system tray in the desktop version), it will pop up a friendly reminder banner and notification.'
    ),
    bullet(
      'Optional PIN Lock:',
      'Sharing your laptop with family? Click "Set Up PIN" to add a 4-to-8 digit passcode.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 10: Everyday Cheat Sheet & Common Questions (FAQ)
  // --------------------------------------------------------------------------
  [
    h1('Page 10 — Everyday Routine Cheat Sheet & Common Questions'),
    p(
      'You don’t need to use every feature on day one! Here is a simple, stress-free daily routine used by most Seshat Notch users, followed by answers to the most common questions.'
    ),
    h2('10.1 The Simple 3-Step Daily Routine'),
    table(
      ['Time of Day', 'What to Do in Seshat Notch', 'Time Required'],
      [
        [
          'Morning (With Coffee)',
          'Open the Today tab. Look at your 2 or 3 tasks for today. Press Ctrl+K if you need to add anything new.',
          '1 minute'
        ],
        [
          'During the Day',
          'Click "Start 25m Focus" when working on an important task (or click "+25m" afterward). Check off tasks as you finish them.',
          'Seconds'
        ],
        [
          'Evening (Wind-Down)',
          'Tick off your daily Habits on the 7-day boxes (or click "Skip" if you had a sick/rest day). Click "Save backup (.json)" if prompted.',
          '1 minute'
        ]
      ]
    ),
    h2('10.2 Frequently Asked Questions (Plain-English FAQ)'),
    bullet(
      'Q: Does Seshat Notch work when I have no internet connection (like on a plane or train)?',
      'A: Yes! Once you open or install Seshat Notch on your Windows laptop, all screens, fonts, and icons are saved inside your browser/computer. You can add tasks, run timers, and check off habits 100% offline.'
    ),
    bullet(
      'Q: Where is my information stored? Can anyone else see it?',
      'A: Your data is stored strictly inside your own computer’s local storage. Nothing is uploaded to the internet. That is why we encourage clicking "Save backup (.json)" regularly so you always have your own backup file in your Documents or OneDrive folder.'
    ),
    bullet(
      'Q: What happens to my settings (like my reminder times and night-owl rollover hour) when I restore a backup?',
      'A: Your backup file (.json) saves everything—all your projects, tasks, habits, focus logs, light/dark theme, reminder times, and night-owl day boundary. Restoring that file brings your entire setup back!'
    ),
    bullet(
      'Q: I accidentally deleted a project or habit! Is it gone forever?',
      'A: No! Go to Settings (Alt+5) -> Recovery Bin. Click "Restore" next to the item, and it will reappear immediately.'
    ),
    bullet(
      'Q: How can I import a quick list of tasks from Notepad or Word?',
      'A: Go to Settings -> Import Plans, and paste lines starting with "- [ ] " (for example: "- [ ] Pack suitcase ~30m @today"). Seshat Notch will turn every line into a scheduled task automatically!'
    ),
    exampleBox(
      'Thank You for Using Seshat Notch!',
      'Remember our motto: "Every day, a notch. Every goal, measured." Small, steady steps recorded honestly every day add up to extraordinary results over a year.'
    ),
  ].join('\n'),
];

// ============================================================================
// 5. Assemble OpenXML Relationships (Including All 6 Embedded PNG Images)
// ============================================================================

const documentBodyXml = pages
  .map((pageContent, idx) => (idx < pages.length - 1 ? `${pageContent}\n${pageBreak()}` : pageContent))
  .join('\n');

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const imageRelsXml = figs
  .map(
    (f) =>
      `  <Relationship Id="${f.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${f.file}"/>`
  )
  .join('\n');

const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
${imageRelsXml}
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/></w:pPr>
  </w:style>
</w:styles>`;

const header1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/></w:pBdr>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="16"/></w:rPr>
      <w:t xml:space="preserve">SESHAT NOTCH — FRIENDLY USER GUIDE   |   </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:color w:val="6B5E50"/><w:sz w:val="16"/></w:rPr>
      <w:t>Every day, a notch. Every goal, measured.</w:t>
    </w:r>
  </w:p>
</w:hdr>`;

const footer1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/></w:pBdr>
      <w:jc w:val="right"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:color w:val="6B5E50"/><w:sz w:val="16"/></w:rPr>
      <w:t xml:space="preserve">Seshat Notch User Guide  —  Page </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE">
      <w:r><w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r>
    </w:fldSimple>
    <w:r>
      <w:rPr><w:color w:val="6B5E50"/><w:sz w:val="16"/></w:rPr>
      <w:t xml:space="preserve"> of </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES">
      <w:r><w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="16"/></w:rPr><w:t>10</w:t></w:r>
    </w:fldSimple>
  </w:p>
</w:ftr>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${documentBodyXml}
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId2"/>
      <w:footerReference w:type="default" r:id="rId3"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Seshat Notch — Friendly 10-Page User Guide</dc:title>
  <dc:subject>Step-by-Step Illustrated User Manual with Everyday Examples</dc:subject>
  <dc:creator>Swashbuckler16</dc:creator>
  <cp:revision>2</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-11-01T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Seshat Notch Documentation Generator</Application>
  <Pages>10</Pages>
  <Company>Seshat Notch</Company>
  <AppVersion>1.0000</AppVersion>
</Properties>`;

const archiveEntries = [
  { name: '[Content_Types].xml', data: contentTypesXml },
  { name: '_rels/.rels', data: rootRelsXml },
  { name: 'docProps/core.xml', data: coreXml },
  { name: 'docProps/app.xml', data: appXml },
  { name: 'word/_rels/document.xml.rels', data: wordRelsXml },
  { name: 'word/styles.xml', data: stylesXml },
  { name: 'word/header1.xml', data: header1Xml },
  { name: 'word/footer1.xml', data: footer1Xml },
  { name: 'word/document.xml', data: documentXml },
  ...figs.map((f) => ({ name: `word/media/${f.file}`, data: f.buf })),
];

const zipBuffer = buildZipArchive(archiveEntries);

const rootDocxPath = path.resolve('Seshat-Notch-User-Manual.docx');
const docsDocxPath = path.resolve('docs', 'Seshat-Notch-User-Manual.docx');
fs.mkdirSync(path.dirname(docsDocxPath), { recursive: true });
fs.writeFileSync(rootDocxPath, zipBuffer);
fs.writeFileSync(docsDocxPath, zipBuffer);

console.log(`Generated friendly 10-page illustrated .docx user manual (${zipBuffer.length} bytes, with 6 embedded PNG figures):`);
console.log(` - ${rootDocxPath}`);
console.log(` - ${docsDocxPath}`);
