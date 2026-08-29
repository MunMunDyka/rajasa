import { deflateSync } from "node:zlib"

/**
 * Generators for the placeholder files the seed writes to disk.
 *
 * The seed creates Document rows, and a Document row whose file does not exist is
 * a 404 the moment someone clicks Preview during a demo. So we generate real,
 * openable PDFs and PNGs rather than inserting metadata for files that aren't there.
 *
 * No dependency needed: a one-page PDF and a solid PNG are both short enough to
 * assemble by hand, and Node ships zlib for the PNG compression.
 */

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

function escapePdfText(value: string): string {
  // Only these three characters are special inside a PDF literal string.
  return value.replace(/([\\()])/g, "\\$1")
}

/** Latin-1 is what the base-14 Helvetica encoding expects. */
function toLatin1(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "?")
}

/**
 * Builds a single-page A4 PDF with a title and body lines in Helvetica.
 * Renders correctly in the browser's built-in PDF viewer, which is what the
 * document preview uses.
 */
export function makePdf(title: string, lines: string[]): Buffer {
  const content = [
    `BT /F1 20 Tf 60 770 Td (${escapePdfText(toLatin1(title))}) Tj ET`,
    "0.48 0.07 0.07 rg 60 750 475 3 re f",
    ...lines.map(
      (line, index) =>
        `BT /F1 11 Tf 60 ${716 - index * 20} Td (${escapePdfText(toLatin1(line))}) Tj ET`
    ),
    `BT /F1 9 Tf 60 60 Td (${escapePdfText("Demo document - not an actual company record.")}) Tj ET`,
  ].join("\n")

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ]

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"))
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, "latin1")
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, "latin1")
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data])

  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)

  return Buffer.concat([length, typeAndData, crc])
}

type Rgb = [number, number, number]

/**
 * Builds a PNG placeholder for a progress photo: a solid ground with a lighter
 * horizontal band, so it reads as an intentional placeholder rather than a
 * broken image.
 */
export function makePng(
  width: number,
  height: number,
  base: Rgb,
  band: Rgb
): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  const bandStart = Math.floor(height * 0.62)
  const bandEnd = Math.floor(height * 0.78)

  let offset = 0
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0 // filter type: none
    const colour = y >= bandStart && y < bandEnd ? band : base
    for (let x = 0; x < width; x++) {
      raw[offset++] = colour[0]
      raw[offset++] = colour[1]
      raw[offset++] = colour[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
}

/** Brand colours from the logo, reused for the placeholders. */
export const NAVY: Rgb = [10, 33, 51]
export const MAROON: Rgb = [122, 18, 17]
export const STEEL: Rgb = [46, 74, 99]
export const SAND: Rgb = [150, 138, 120]
