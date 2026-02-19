/**
 * parseEbook — extracts raw text from common ebook/document formats.
 * Returns a plain string passed to parseText() for word extraction.
 *
 * Supported:
 *   .txt .html .htm   plain text / markup
 *   .epub             EPUB (JSZip + spine-ordered HTML)
 *   .pdf              PDF.js text extraction
 *   .docx             Office Open XML (JSZip + XML)
 *   .fb2              FictionBook XML
 *   .rtf              Rich Text Format (regex strip)
 *   .mobi             PalmDOC / MOBI binary (built-in parser)
 *   .azw .azw3        Amazon KF8 binary (built-in parser)
 *
 * NOT supported:
 *   .kfx              Amazon proprietary encrypted container — no public spec,
 *                     not parseable client-side.
 */

// ─── DOM helpers ────────────────────────────────────────────────────────────

function domText(xmlString, mimeType = 'text/html') {
  const doc = new DOMParser().parseFromString(xmlString, mimeType);
  doc.querySelectorAll('script, style, head').forEach(el => el.remove());
  return doc.body?.innerText ?? doc.documentElement?.textContent ?? '';
}

function stripHtmlEntities(str) {
  return str
    .replace(/&amp;/gi,  '&')
    .replace(/&lt;/gi,   '<')
    .replace(/&gt;/gi,   '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g,   (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ─── PalmDOC decompressor ───────────────────────────────────────────────────
// LZ77-based compression used by MOBI and older PalmPilot documents.

function decompressPalmDoc(data) {
  const out = [];
  let i = 0;
  while (i < data.length) {
    const byte = data[i++];
    if (byte === 0x00) {
      // Literal zero
      out.push(0x00);
    } else if (byte <= 0x08) {
      // Next `byte` bytes are literal
      for (let j = 0; j < byte && i < data.length; j++) out.push(data[i++]);
    } else if (byte <= 0x7F) {
      // Single literal byte
      out.push(byte);
    } else if (byte <= 0xBF) {
      // 2-byte back-reference: 11 bits distance, 3 bits (length-3)
      const b2       = data[i++] ?? 0;
      const distance = ((byte & 0x3F) << 5) | (b2 >> 3);
      const length   = (b2 & 0x07) + 3;
      const base     = out.length - distance;
      for (let j = 0; j < length; j++) out.push(out[base + (j % distance)] ?? 0x20);
    } else {
      // 0xC0–0xFF: space + printable ASCII
      out.push(0x20);
      out.push(byte ^ 0x80);
    }
  }
  return new TextDecoder('windows-1252').decode(new Uint8Array(out));
}

// ─── MOBI / AZW3 binary parser ──────────────────────────────────────────────
//
// Both MOBI and AZW3 (.azw/.azw3) use the PalmDB container.
// AZW3 adds a KF8 section after a BOUNDARY record containing HTML5.
// Regular MOBI stores lightly HTML-tagged text in PalmDOC records.

function readString(data, offset, length) {
  return new TextDecoder('ascii').decode(data.slice(offset, offset + length));
}

async function parseMobiBuffer(buffer) {
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // ── PalmDB header ──
  const type    = readString(data, 60, 4);
  const creator = readString(data, 64, 4);
  if (type !== 'BOOK' || creator !== 'MOBI') {
    throw new Error('Not a valid MOBI/AZW file (missing BOOK/MOBI signature).');
  }

  const numRecords = view.getUint16(76, false);
  if (numRecords < 2) throw new Error('MOBI file has no content records.');

  // Record offset table: each entry = 4-byte offset + 4-byte attrs/uid
  const offsets = [];
  for (let i = 0; i < numRecords; i++) {
    offsets.push(view.getUint32(78 + i * 8, false));
  }
  offsets.push(data.length); // sentinel

  // ── Record 0: PalmDOC header (16 bytes) + MOBI header ──
  const rec0       = offsets[0];
  const compression   = view.getUint16(rec0,      false); // 1=none 2=PalmDOC
  const numTextRecs   = view.getUint16(rec0 + 8,  false);

  // Locate MOBI header inside record 0 (starts at byte 16 of the record)
  const mobi0 = rec0 + 16;
  if (readString(data, mobi0, 4) !== 'MOBI') throw new Error('Missing MOBI header.');
  const mobi0Len  = view.getUint32(mobi0 + 4, false);

  // EXTH block follows MOBI header
  const exthFlags  = view.getUint32(mobi0 + 0x70, false);
  const hasExth    = !!(exthFlags & 0x40);
  let exthSize     = 0;
  if (hasExth) {
    const exthOff = mobi0 + mobi0Len;
    if (readString(data, exthOff, 4) === 'EXTH') {
      exthSize = view.getUint32(exthOff + 4, false);
    }
  }

  // ── Scan for KF8 BOUNDARY record (marks start of AZW3/KF8 section) ──
  //    Boundary records are 8 bytes and start with the ASCII bytes for "BOUNDARY"
  //    or contain the magic 0xE98E0D0A bytes.
  let kf8Start = -1;
  for (let i = 1; i < numRecords - 1; i++) {
    const rOff = offsets[i];
    const rLen = offsets[i + 1] - rOff;
    if (rLen >= 8) {
      const magic = readString(data, rOff, 8);
      if (magic === 'BOUNDARY') { kf8Start = i + 1; break; }
    }
    if (rLen === 4 && data[rOff] === 0xE9 && data[rOff+1] === 0x8E) {
      kf8Start = i + 1; break;
    }
  }

  // ── KF8 path (AZW3) — HTML content ──
  if (kf8Start > 0) {
    const kRec0     = offsets[kf8Start];
    const kComp     = view.getUint16(kRec0,     false);
    const kNumText  = view.getUint16(kRec0 + 8, false);

    const parts = [];
    for (let i = 1; i <= kNumText && (kf8Start + i) < numRecords; i++) {
      const idx   = kf8Start + i;
      const start = offsets[idx];
      const end   = offsets[idx + 1];
      const rec   = data.slice(start, end);
      // KF8 records often have a trailing size indicator; strip last 4 bytes if flagged
      const chunk = kComp === 2 ? decompressPalmDoc(rec) : new TextDecoder('utf-8').decode(rec);
      parts.push(chunk);
    }
    const html = stripHtmlEntities(parts.join(''));
    return domText(html, 'text/html');
  }

  // ── Classic MOBI path — PalmDOC compressed text ──
  const parts = [];
  for (let i = 1; i <= numTextRecs && i < numRecords; i++) {
    const start = offsets[i];
    const end   = offsets[i + 1];
    const rec   = data.slice(start, end);

    // Strip trailing multi-byte size (last 2 bytes = overlap size)
    const usable = rec.slice(0, rec.length - 2 < 0 ? 0 : rec.length - 2);

    let chunk;
    if (compression === 1) {
      chunk = new TextDecoder('windows-1252').decode(usable);
    } else if (compression === 2) {
      chunk = decompressPalmDoc(usable);
    } else {
      throw new Error('HUFF/CDIC compressed MOBI is not supported. Try converting to EPUB first.');
    }
    parts.push(chunk);
  }

  const raw = parts.join('');
  // MOBI text may contain HTML-ish tags
  return stripHtmlEntities(raw.replace(/<[^>]{0,200}>/g, ' '));
}

// ─── Format parsers ─────────────────────────────────────────────────────────

async function parseTxt(file) { return file.text(); }

async function parseHtml(file) {
  return domText(await file.text(), 'text/html');
}

async function parseFb2(file) {
  return domText(await file.text(), 'application/xml');
}

async function parseRtf(file) {
  const raw = await file.text();
  return raw
    .replace(/\{\\[^{}]+\}/g, '')     // grouped control sequences
    .replace(/\\([a-z]+)(-?\d+)? ?/g, '') // control words
    .replace(/\{|\}/g, '')
    .replace(/\\([^a-z])/g, '$1')     // escaped punctuation
    .replace(/\\'[0-9a-f]{2}/gi, ' ') // hex escapes
    .trim();
}

async function parseEpub(file) {
  const JSZip = (await import('jszip')).default;
  const zip   = await JSZip.loadAsync(await file.arrayBuffer());

  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  let opfPath = null;
  if (containerXml) {
    const m = containerXml.match(/full-path="([^"]+\.opf)"/i);
    if (m) opfPath = m[1];
  }

  let orderedHrefs = [];
  if (opfPath) {
    const opfXml  = await zip.file(opfPath)?.async('string');
    const opfBase = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
    if (opfXml) {
      const doc = new DOMParser().parseFromString(opfXml, 'application/xml');
      const manifest = {};
      doc.querySelectorAll('manifest item').forEach(item => {
        manifest[item.getAttribute('id')] = item.getAttribute('href');
      });
      doc.querySelectorAll('spine itemref').forEach(ref => {
        const href = manifest[ref.getAttribute('idref')];
        if (href) orderedHrefs.push(opfBase + href);
      });
    }
  }

  if (!orderedHrefs.length) {
    orderedHrefs = Object.keys(zip.files).filter(n => /\.(html|xhtml|htm)$/i.test(n));
  }

  const parts = await Promise.all(orderedHrefs.map(async href => {
    const f = zip.file(href) ?? zip.file(decodeURIComponent(href));
    if (!f) return '';
    return domText(await f.async('string'), 'text/html');
  }));
  return parts.join('\n');
}

async function parsePdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
  const pdf   = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1)
        .then(p => p.getTextContent())
        .then(tc => tc.items.map(it => it.str).join(' '))
    )
  );
  return pages.join('\n');
}

async function parseDocx(file) {
  const JSZip = (await import('jszip')).default;
  const zip   = await JSZip.loadAsync(await file.arrayBuffer());
  const xml   = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('No word/document.xml found — is this a valid .docx?');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.querySelectorAll('p'))
    .map(p => Array.from(p.querySelectorAll('t')).map(t => t.textContent).join(''))
    .join('\n');
}

async function parseMobi(file)  { return parseMobiBuffer(await file.arrayBuffer()); }
async function parseAzw(file)   { return parseMobiBuffer(await file.arrayBuffer()); }

// ─── Dispatcher ──────────────────────────────────────────────────────────────

const PARSERS = {
  txt:  parseTxt,
  html: parseHtml,
  htm:  parseHtml,
  epub: parseEpub,
  pdf:  parsePdf,
  docx: parseDocx,
  fb2:  parseFb2,
  rtf:  parseRtf,
  mobi: parseMobi,
  azw:  parseAzw,
  azw3: parseAzw,
};

export const ACCEPTED_EXTENSIONS = Object.keys(PARSERS);
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map(e => `.${e}`).join(',');

export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'kfx') throw new Error(
    '.kfx is Amazon\'s proprietary encrypted format and cannot be read client-side. ' +
    'Convert it to EPUB using Calibre first.'
  );
  const parser = PARSERS[ext];
  if (!parser) throw new Error(`Unsupported format: .${ext}`);
  return parser(file);
}
