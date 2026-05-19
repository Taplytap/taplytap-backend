import { deflateSync, inflateSync } from "zlib";
import type { QrCode } from "@/lib/types";

const pngSize = 1272;
const moduleSize = 24;
const quietZone = 6;
const qrVersion = 6;
const qrSize = 17 + qrVersion * 4;
const dataCodewords = 60;
const eccCodewordsPerBlock = 28;
const dataBlockCount = 4;
const dataCodewordsPerBlock = 15;

type BatchQrAsset = Pick<QrCode, "code" | "status"> & {
  public_url: string;
  created_at: string;
};

const gfExp = new Array<number>(512);
const gfLog = new Array<number>(256);
let value = 1;

for (let i = 0; i < 255; i += 1) {
  gfExp[i] = value;
  gfLog[value] = i;
  value <<= 1;

  if (value & 0x100) {
    value ^= 0x11d;
  }
}

for (let i = 255; i < 512; i += 1) {
  gfExp[i] = gfExp[i - 255];
}

const crcTable = new Uint32Array(256);

for (let i = 0; i < 256; i += 1) {
  let c = i;

  for (let j = 0; j < 8; j += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  crcTable[i] = c >>> 0;
}

export function createBatchCsv(rows: BatchQrAsset[]) {
  const body = rows
    .map((row) => [row.code, row.public_url, row.status, row.created_at].map(csvCell).join(","))
    .join("\n");

  return `code,public_url,status,created_at\n${body}\n`;
}

export function createBatchQrRows(rows: BatchQrAsset[]) {
  return rows.map((row) => ({
    ...row,
    public_url: row.public_url.trim()
  }));
}

export function createQrPngZip(rows: BatchQrAsset[]) {
  const files = rows.map((row) => ({
    name: `${row.code}.png`,
    data: createQrPng(row.public_url)
  }));

  return createZip(files);
}

export function verifyQrBatchAssets(rows: BatchQrAsset[]) {
  const firstRow = rows[0];

  if (!firstRow) {
    throw new Error("Batch has no QR rows to verify.");
  }

  const payload = firstRow.public_url.trim();

  if (payload !== firstRow.public_url) {
    throw new Error("QR payload contains leading or trailing whitespace.");
  }

  if (payload !== `https://app.taplytap.io/user/${firstRow.code}`) {
    throw new Error(`QR payload does not match CSV public_url for ${firstRow.code}.`);
  }

  const png = createQrPng(payload);
  const details = inspectPng(png);

  if (details.width < 1200 || details.height < 1200) {
    throw new Error("Generated QR PNG is smaller than 1200x1200.");
  }

  if (!details.quietZoneIsWhite) {
    throw new Error("Generated QR PNG quiet zone is not pure white.");
  }

  return {
    verifiedCode: firstRow.code,
    verifiedPayload: payload,
    width: details.width,
    height: details.height,
    quietZonePixels: details.quietZonePixels
  };
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function createQrPng(url: string) {
  const payload = url.trim();

  if (!payload.startsWith("https://app.taplytap.io/user/")) {
    throw new Error(`Invalid QR payload: ${payload}`);
  }

  const matrix = createQrMatrix(payload);
  const pixels = Buffer.alloc(pngSize * pngSize, 255);

  for (let row = 0; row < qrSize; row += 1) {
    for (let col = 0; col < qrSize; col += 1) {
      if (!matrix[row][col]) continue;

      const startY = (row + quietZone) * moduleSize;
      const startX = (col + quietZone) * moduleSize;

      for (let y = 0; y < moduleSize; y += 1) {
        const offset = (startY + y) * pngSize + startX;
        pixels.fill(0, offset, offset + moduleSize);
      }
    }
  }

  const raw = Buffer.alloc((pngSize + 1) * pngSize);

  for (let y = 0; y < pngSize; y += 1) {
    raw[y * (pngSize + 1)] = 0;
    pixels.copy(raw, y * (pngSize + 1) + 1, y * pngSize, (y + 1) * pngSize);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", Buffer.concat([uint32(pngSize), uint32(pngSize), Buffer.from([8, 0, 0, 0, 0])])),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function createQrMatrix(url: string) {
  const data = encodeData(url);
  const blocks = Array.from({ length: dataBlockCount }, (_, index) =>
    data.slice(index * dataCodewordsPerBlock, (index + 1) * dataCodewordsPerBlock)
  );
  const eccBlocks = blocks.map((block) => reedSolomon(block, eccCodewordsPerBlock));
  const codewords: number[] = [];

  for (let i = 0; i < dataCodewordsPerBlock; i += 1) {
    for (const block of blocks) codewords.push(block[i]);
  }

  for (let i = 0; i < eccCodewordsPerBlock; i += 1) {
    for (const block of eccBlocks) codewords.push(block[i]);
  }

  const modules = createEmptyMatrix();
  const reserved = createEmptyMatrix();

  drawFunctionPatterns(modules, reserved);
  drawCodewords(modules, reserved, codewords);
  drawFormatBits(modules, reserved);

  return modules;
}

function encodeData(url: string) {
  const bytes = Buffer.from(url, "utf8");
  const bits: number[] = [];

  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);

  for (let i = 0; i < bytes.length; i += 1) {
    appendBits(bits, bytes[i], 8);
  }

  const capacity = dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];

  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  }

  for (let pad = 0xec; codewords.length < dataCodewords; pad ^= 0xfd) {
    codewords.push(pad);
  }

  return codewords;
}

function createEmptyMatrix() {
  return Array.from({ length: qrSize }, () => Array.from({ length: qrSize }, () => false));
}

function drawFunctionPatterns(modules: boolean[][], reserved: boolean[][]) {
  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, qrSize - 7, 0);
  drawFinder(modules, reserved, 0, qrSize - 7);
  drawAlignment(modules, reserved, 34, 34);

  for (let i = 8; i < qrSize - 8; i += 1) {
    const bit = i % 2 === 0;
    setReserved(modules, reserved, 6, i, bit);
    setReserved(modules, reserved, i, 6, bit);
  }

  setReserved(modules, reserved, 4 * qrVersion + 9, 8, true);

  for (let i = 0; i < 9; i += 1) {
    reserve(reserved, 8, i);
    reserve(reserved, i, 8);
  }

  for (let i = 0; i < 8; i += 1) {
    reserve(reserved, qrSize - 1 - i, 8);
    reserve(reserved, 8, qrSize - 1 - i);
  }
}

function drawFinder(modules: boolean[][], reserved: boolean[][], left: number, top: number) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const row = top + y;
      const col = left + x;

      if (row < 0 || row >= qrSize || col < 0 || col >= qrSize) continue;

      const dark =
        (x >= 0 && x <= 6 && (y === 0 || y === 6)) ||
        (y >= 0 && y <= 6 && (x === 0 || x === 6)) ||
        (x >= 2 && x <= 4 && y >= 2 && y <= 4);

      setReserved(modules, reserved, row, col, dark);
    }
  }
}

function drawAlignment(modules: boolean[][], reserved: boolean[][], centerRow: number, centerCol: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const dark = Math.max(Math.abs(x), Math.abs(y)) !== 1;
      setReserved(modules, reserved, centerRow + y, centerCol + x, dark);
    }
  }
}

function drawCodewords(modules: boolean[][], reserved: boolean[][], codewords: number[]) {
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1)
  );
  let bitIndex = 0;
  let upward = true;

  for (let col = qrSize - 1; col >= 1; col -= 2) {
    if (col === 6) col -= 1;

    for (let i = 0; i < qrSize; i += 1) {
      const row = upward ? qrSize - 1 - i : i;

      for (let offset = 0; offset < 2; offset += 1) {
        const currentCol = col - offset;

        if (reserved[row][currentCol]) continue;

        const bit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        const masked = bit !== ((row + currentCol) % 2 === 0);
        modules[row][currentCol] = masked;
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function drawFormatBits(modules: boolean[][], reserved: boolean[][]) {
  const bits = getFormatBits();

  for (let i = 0; i <= 5; i += 1) setReserved(modules, reserved, 8, i, getBit(bits, i));
  setReserved(modules, reserved, 8, 7, getBit(bits, 6));
  setReserved(modules, reserved, 8, 8, getBit(bits, 7));
  setReserved(modules, reserved, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i += 1) setReserved(modules, reserved, 14 - i, 8, getBit(bits, i));
  for (let i = 0; i < 8; i += 1) setReserved(modules, reserved, qrSize - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i += 1) setReserved(modules, reserved, 8, qrSize - 15 + i, getBit(bits, i));
}

function getFormatBits() {
  const data = 0b10000;
  let bits = data << 10;

  for (let i = 14; i >= 10; i -= 1) {
    if (((bits >>> i) & 1) !== 0) {
      bits ^= 0x537 << (i - 10);
    }
  }

  return ((data << 10) | bits) ^ 0x5412;
}

function getBit(value: number, index: number) {
  return ((value >>> index) & 1) !== 0;
}

function setReserved(modules: boolean[][], reserved: boolean[][], row: number, col: number, dark: boolean) {
  modules[row][col] = dark;
  reserved[row][col] = true;
}

function reserve(reserved: boolean[][], row: number, col: number) {
  reserved[row][col] = true;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function reedSolomon(data: number[], degree: number) {
  const generator = reedSolomonGenerator(degree);
  const message = [...data, ...Array.from({ length: degree }, () => 0)];
  let offset = 0;

  while (offset < data.length) {
    const factor = message[offset];

    if (factor !== 0) {
      for (let i = 0; i < generator.length; i += 1) {
        message[offset + i] ^= gfMultiply(generator[i], factor);
      }
    }

    offset += 1;
  }

  return message.slice(message.length - degree);
}

function reedSolomonGenerator(degree: number) {
  let result = [1];

  for (let i = 0; i < degree; i += 1) {
    const next = Array.from({ length: result.length + 1 }, () => 0);

    for (let j = 0; j < result.length; j += 1) {
      next[j] ^= result[j];
      next[j + 1] ^= gfMultiply(result[j], gfExp[i]);
    }

    result = next;
  }

  return result;
}

function gfMultiply(a: number, b: number) {
  return a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]];
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  return Buffer.concat([
    uint32(data.length),
    typeBuffer,
    data,
    uint32(crc32(Buffer.concat([typeBuffer, data])))
  ]);
}

function createZip(files: { name: string; data: Buffer }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const local = Buffer.concat([
      uint32le(0x04034b50),
      uint16le(20),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(crc),
      uint32le(file.data.length),
      uint32le(file.data.length),
      uint16le(name.length),
      uint16le(0),
      name,
      file.data
    ]);
    const central = Buffer.concat([
      uint32le(0x02014b50),
      uint16le(20),
      uint16le(20),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(crc),
      uint32le(file.data.length),
      uint32le(file.data.length),
      uint16le(name.length),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(0),
      uint32le(offset),
      name
    ]);

    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    uint32le(0x06054b50),
    uint16le(0),
    uint16le(0),
    uint16le(files.length),
    uint16le(files.length),
    uint32le(centralDirectory.length),
    uint32le(offset),
    uint16le(0)
  ]);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i += 1) {
    const byte = data[i];
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function inspectPng(png: Buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    offset += 4;
    const type = png.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = png.subarray(offset, offset + length);
    offset += length + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    }

    if (type === "IDAT") {
      idatChunks.push(data);
    }
  }

  const raw = inflateSync(Buffer.concat(idatChunks));
  const quietZonePixels = quietZone * moduleSize;
  const samplePoints = [
    [0, 0],
    [quietZonePixels - 1, quietZonePixels - 1],
    [Math.floor(quietZonePixels / 2), Math.floor(quietZonePixels / 2)],
    [width - 1, height - 1],
    [width - quietZonePixels, height - quietZonePixels]
  ];
  const quietZoneIsWhite = samplePoints.every(([x, y]) => raw[y * (width + 1) + 1 + x] === 255);

  return {
    width,
    height,
    quietZonePixels,
    quietZoneIsWhite
  };
}

function uint32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function uint16le(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32le(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}
