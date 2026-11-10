// Same byte validation and metadata stripping as the website avatar uploader.
function isWebp(bytes: Uint8Array) {
  return (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
  );
}

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return (
    bytes.length > 8 && signature.every((byte, index) => bytes[index] === byte)
  );
}

/** RIFF chunks that actually draw the image. EXIF, XMP and ICCP are dropped. */
const WEBP_KEEP = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF"]);

function stripWebpMetadata(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [];
  let offset = 12; // past RIFF____WEBP

  while (offset + 8 <= bytes.length) {
    const fourcc = String.fromCharCode(
      bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3],
    );
    const size = view.getUint32(offset + 4, true);
    const padded = size + (size % 2); // RIFF chunks are even-aligned
    const end = offset + 8 + padded;

    if (end > bytes.length) break; // truncated: stop rather than trust it
    if (WEBP_KEEP.has(fourcc)) kept.push(bytes.subarray(offset, end));

    offset = end;
  }

  if (!kept.length) return null;

  const body = kept.reduce((total, chunk) => total + chunk.length, 0);
  const out = new Uint8Array(12 + body);
  const header = new DataView(out.buffer);

  out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  header.setUint32(4, 4 + body, true); // size of everything after this field
  out.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP

  let cursor = 12;
  for (const chunk of kept) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }

  return out;
}

/** PNG chunks that draw the image. eXIf/tEXt/iTXt/zTXt and friends are dropped. */
const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "acTL", "fcTL", "fdAT"]);

function stripPngMetadata(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [bytes.subarray(0, 8)]; // signature
  let offset = 8;

  while (offset + 8 <= bytes.length) {
    const size = view.getUint32(offset, false);
    const type = String.fromCharCode(
      bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7],
    );
    const end = offset + 12 + size; // length + type + data + crc

    if (end > bytes.length) break;
    if (PNG_KEEP.has(type)) kept.push(bytes.subarray(offset, end));

    offset = end;
    if (type === "IEND") break;
  }

  if (kept.length < 2) return null;

  const total = kept.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;

  for (const chunk of kept) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }

  return out;
}

/** Shared with the testimonial photo intake: same magic-number check, same
    metadata stripping, same refusal to decode. Any second copy of this would
    be the one that forgets to strip EXIF. */
export function sanitiseImage(bytes: Uint8Array) {
  if (isWebp(bytes)) {
    const stripped = stripWebpMetadata(bytes);
    return stripped && { bytes: stripped, contentType: "image/webp", ext: "webp" };
  }

  if (isPng(bytes)) {
    const stripped = stripPngMetadata(bytes);
    return stripped && { bytes: stripped, contentType: "image/png", ext: "png" };
  }

  // JPEG is deliberately not accepted: its EXIF lives in APP segments that are
  // messier to walk safely, and the browser already hands us WebP or PNG.
  return null;
}

