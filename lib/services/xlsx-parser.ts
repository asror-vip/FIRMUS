/**
 * Zero-dependency OOXML (.xlsx) ZIP + XML parser using standard Web DecompressionStream.
 * Works natively in both modern browsers (in-memory Zero-PII) and Node 20+/22+.
 */

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function colLettersToIndex(letters: string): number {
  let col = 0;
  const upper = letters.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      col = col * 26 + (code - 64);
    }
  }
  return Math.max(0, col - 1);
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Ushbu muhitda .xlsx DecompressionStream qoʻllab-quvvatlanmaydi");
  }
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  const safeCopy = new Uint8Array(compressed.byteLength);
  safeCopy.set(compressed);
  await writer.write(safeCopy);
  await writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLen += value.byteLength;
    }
  }

  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

interface ZipEntryMeta {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function readZipCentralDirectory(bytes: Uint8Array): ZipEntryMeta[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minOffset = Math.max(0, bytes.byteLength - 65557);
  let eocdOffset = -1;

  for (let i = bytes.byteLength - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Notoʻgʻri .xlsx (ZIP) fayl tuzilmasi");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");
  const entries: ZipEntryMeta[] = [];

  let cursor = cdOffset;
  for (let i = 0; i < totalEntries && cursor + 46 <= bytes.byteLength; i++) {
    const sig = view.getUint32(cursor, true);
    if (sig !== 0x02014b50) break;

    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
    entries.push({ name, method, compressedSize, localHeaderOffset });

    cursor += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

async function readZipEntryText(bytes: Uint8Array, entry: ZipEntryMeta): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lh = entry.localHeaderOffset;
  if (lh + 30 > bytes.byteLength || view.getUint32(lh, true) !== 0x04034b50) {
    return "";
  }
  const nameLen = view.getUint16(lh + 26, true);
  const extraLen = view.getUint16(lh + 28, true);
  const dataStart = lh + 30 + nameLen + extraLen;
  const slice = bytes.subarray(dataStart, dataStart + entry.compressedSize);

  let rawBytes: Uint8Array;
  if (entry.method === 0) {
    rawBytes = slice;
  } else if (entry.method === 8) {
    rawBytes = await inflateRaw(slice);
  } else {
    throw new Error(`Qoʻllab-quvvatlanmaydigan ZIP siqish usuli: ${entry.method}`);
  }

  return new TextDecoder("utf-8").decode(rawBytes);
}

function parseSharedStrings(xmlText: string): string[] {
  const strings: string[] = [];
  const siMatches = xmlText.match(/<si\b[^>]*>[\s\S]*?<\/si>/gi) || [];
  for (const si of siMatches) {
    const tMatches = si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || [];
    let combined = "";
    for (const tTag of tMatches) {
      const inner = tTag.replace(/^<t\b[^>]*>/i, "").replace(/<\/t>$/i, "");
      combined += decodeXmlEntities(inner);
    }
    strings.push(combined);
  }
  return strings;
}

function parseAttr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return m?.[1] || "";
}

function extractXmlInner(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m?.[1] ? decodeXmlEntities(m[1]) : "";
}

function parseWorksheetRows(sheetXml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowMatches = sheetXml.match(/<row\b[^>]*>[\s\S]*?<\/row>/gi) || [];

  for (const rowXml of rowMatches) {
    const rowCells: string[] = [];
    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi;
    let cursorCol = 0;
    let m: RegExpExecArray | null;

    while ((m = cellRegex.exec(rowXml)) !== null) {
      const attrs = m[1] || "";
      const body = m[2] || "";
      const ref = parseAttr(attrs, "r");
      const colMatch = ref.match(/^([A-Z]+)/i);
      const colIdx = colMatch ? colLettersToIndex(colMatch[1]) : cursorCol;
      cursorCol = colIdx + 1;

      while (rowCells.length <= colIdx) {
        rowCells.push("");
      }

      const cellType = parseAttr(attrs, "t");
      let value = "";

      if (cellType === "inlineStr") {
        const isBlock = extractXmlInner(body, "is");
        const tMatches = isBlock.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || [];
        if (tMatches.length > 0) {
          value = tMatches
            .map((t) => decodeXmlEntities(t.replace(/^<t\b[^>]*>/i, "").replace(/<\/t>$/i, "")))
            .join("");
        } else {
          value = extractXmlInner(body, "t") || isBlock.replace(/<[^>]+>/g, "");
        }
      } else {
        const vVal = extractXmlInner(body, "v");
        if (cellType === "s") {
          const idx = parseInt(vVal, 10);
          value = Number.isFinite(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx] : "";
        } else if (cellType === "b") {
          value = vVal === "1" ? "TRUE" : "FALSE";
        } else {
          value = vVal;
        }
      }

      rowCells[colIdx] = value.trim();
    }

    if (rowCells.some((c) => c.length > 0)) {
      rows.push(rowCells);
    }
  }

  return rows;
}

/**
 * Converts Excel serial date (days since 1899-12-30) to YYYY-MM-DD when applicable.
 */
export function excelSerialToIsoDate(serialRaw: string): string | null {
  const num = parseFloat(serialRaw.trim());
  if (!Number.isFinite(num) || num < 35000 || num > 65000) return null;
  const wholeDays = Math.floor(num);
  const utcMs = Date.UTC(1899, 11, 30) + wholeDays * 86_400_000;
  return new Date(utcMs).toISOString().slice(0, 10);
}

/**
 * Parses a binary .xlsx buffer directly into a 2D array of string cells without third-party packages.
 */
export async function parseXlsxBufferToRows(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);
  const entries = readZipCentralDirectory(bytes);

  const sharedStringsEntry = entries.find((e) => e.name.toLowerCase() === "xl/sharedstrings.xml");
  const sharedStrings = sharedStringsEntry
    ? parseSharedStrings(await readZipEntryText(bytes, sharedStringsEntry))
    : [];

  const sheetEntry =
    entries.find((e) => e.name.toLowerCase() === "xl/worksheets/sheet1.xml") ||
    entries.find((e) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name));

  if (!sheetEntry) {
    throw new Error(".xlsx ichida ishchi varaq (worksheet) topilmadi");
  }

  const sheetXml = await readZipEntryText(bytes, sheetEntry);
  return parseWorksheetRows(sheetXml, sharedStrings);
}
