// Standalone QR Code Matrix & SVG Generator (Zero-dependency)
// Based on ISO/IEC 18004 specifications (Byte mode, Error Correction Level M)

const PAD0 = 0xec;
const PAD1 = 0x11;

// GF(256) Log & Antilog tables
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP_TABLE[i] = x;
  EXP_TABLE[i + 255] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gmul(x, y) {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function rsComputePoly(ecCount) {
  let poly = [1];
  for (let i = 0; i < ecCount; i++) {
    const factor = EXP_TABLE[i];
    const nextPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gmul(poly[j], factor);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsComputeRemainder(data, ecCount) {
  const genPoly = rsComputePoly(ecCount);
  const remainder = new Array(ecCount).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let j = 0; j < ecCount; j++) {
      remainder[j] ^= gmul(genPoly[j], factor);
    }
  }
  return remainder;
}

function getVersionInfo(dataLength) {
  if (dataLength <= 32) {
    return { version: 3, size: 29, totalCodewords: 70, ecCodewords: 26, dataCodewords: 44 };
  } else if (dataLength <= 50) {
    return { version: 4, size: 33, totalCodewords: 100, ecCodewords: 36, dataCodewords: 64 };
  } else {
    return { version: 5, size: 37, totalCodewords: 134, ecCodewords: 48, dataCodewords: 86 };
  }
}

export function generateQrMatrix(text) {
  const utf8 = new TextEncoder().encode(text);
  const vInfo = getVersionInfo(utf8.length);
  const size = vInfo.size;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));

  function addFinder(r, c) {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const row = r + i;
        const col = c + j;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (
            (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
            (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
            (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          ) {
            matrix[row][col] = 1;
          } else {
            matrix[row][col] = 0;
          }
        }
      }
    }
  }
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  const alignPos = vInfo.version === 3 ? [6, 22] : vInfo.version === 4 ? [6, 26] : [6, 30];
  if (vInfo.version >= 2) {
    for (const r of alignPos) {
      for (const c of alignPos) {
        if (matrix[r][c] !== null) continue;
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            if (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) {
              matrix[r + i][c + j] = 1;
            } else {
              matrix[r + i][c + j] = 0;
            }
          }
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  matrix[4 * vInfo.version + 9][8] = 1;

  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }

  const bitstream = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1);
    }
  }
  pushBits(0b0100, 4);
  pushBits(utf8.length, 8);
  for (const b of utf8) {
    pushBits(b, 8);
  }
  const maxBits = vInfo.dataCodewords * 8;
  const termLen = Math.min(4, maxBits - bitstream.length);
  for (let i = 0; i < termLen; i++) bitstream.push(0);

  while (bitstream.length % 8 !== 0) bitstream.push(0);

  let padToggle = false;
  while (bitstream.length < maxBits) {
    pushBits(padToggle ? PAD1 : PAD0, 8);
    padToggle = !padToggle;
  }

  const dataCodewords = [];
  for (let i = 0; i < bitstream.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bitstream[i + j];
    dataCodewords.push(byte);
  }

  const ecRemainder = rsComputeRemainder(dataCodewords, vInfo.ecCodewords);
  const finalCodewords = dataCodewords.concat(ecRemainder);

  const finalBits = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) finalBits.push((cw >> i) & 1);
  }

  let bitIdx = 0;
  let right = size - 1;
  let upward = true;

  while (right > 0) {
    if (right === 6) right--;
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const col of [right, right - 1]) {
        if (matrix[r][col] === null) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = mask ? bit ^ 1 : bit;
        }
      }
    }
    right -= 2;
    upward = !upward;
  }

  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  matrix[8][0] = formatBits[0];
  matrix[8][1] = formatBits[1];
  matrix[8][2] = formatBits[2];
  matrix[8][3] = formatBits[3];
  matrix[8][4] = formatBits[4];
  matrix[8][5] = formatBits[5];
  matrix[8][7] = formatBits[6];
  matrix[8][8] = formatBits[7];
  matrix[7][8] = formatBits[8];
  matrix[5][8] = formatBits[9];
  matrix[4][8] = formatBits[10];
  matrix[3][8] = formatBits[11];
  matrix[2][8] = formatBits[12];
  matrix[1][8] = formatBits[13];
  matrix[0][8] = formatBits[14];

  for (let i = 0; i < 8; i++) {
    matrix[8][size - 1 - i] = formatBits[14 - i];
  }
  for (let i = 0; i < 7; i++) {
    matrix[size - 7 + i][8] = formatBits[i];
  }

  return matrix;
}

export function generateQrSvgPath(text, size = 180) {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const cellSize = size / (n + 4);
  let d = '';

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + 2) * cellSize;
        const y = (r + 2) * cellSize;
        d += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }
  return { path: d, totalSize: size };
}
