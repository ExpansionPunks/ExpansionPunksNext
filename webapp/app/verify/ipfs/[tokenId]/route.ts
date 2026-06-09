import { IPFS_GATEWAY, IPFS_IMAGE_CID, isValidTokenId } from "@/lib/verify-config";

export const runtime = "nodejs";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Color-management chunks. The originals carry gAMA (0.45455) + cHRM, which the
// browser honors on decode — shifting and dithering pixels (e.g. the #ffbf00
// amber) away from the raw palette the reference pipeline (Pillow) and the
// onchain SVG render use. Stripping them makes the browser decode the PNG as
// raw sRGB, so the in-browser comparison matches the published report.
const STRIP_CHUNKS = new Set(["gAMA", "cHRM", "iCCP", "sRGB", "sBIT"]);

function stripPngColorChunks(input: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(input);
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return input; // not a PNG; pass through
  }
  const view = new DataView(input);
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const total = 12 + length; // length(4) + type(4) + data + crc(4)
    if (offset + total > bytes.length) break; // malformed; stop here
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    if (!STRIP_CHUNKS.has(type)) kept.push(bytes.subarray(offset, offset + total));
    offset += total;
    if (type === "IEND") break;
  }
  const size = kept.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(size);
  let p = 0;
  for (const chunk of kept) {
    out.set(chunk, p);
    p += chunk.length;
  }
  return out.buffer as ArrayBuffer;
}

// Same-origin proxy for the original IPFS image. Fetching the Pinata gateway
// directly from the browser would taint the comparison canvas (no CORS header),
// so we relay it server-side. Also shields users from gateway rate limits.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await params;
  const id = Number(tokenId);

  if (!isValidTokenId(id)) {
    return new Response("Unknown punk", { status: 404 });
  }

  const url = `${IPFS_GATEWAY}/${IPFS_IMAGE_CID}/punk${id}.png`;

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "expansionpunks-verify/1.0" },
      // The CID is immutable; let the platform cache it.
      cache: "force-cache",
    });
    if (!upstream.ok) {
      return new Response("Original image unavailable", { status: 502 });
    }
    const body = await upstream.arrayBuffer();
    return new Response(stripPngColorChunks(body), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/png",
      },
    });
  } catch {
    return new Response("Original image unavailable", { status: 502 });
  }
}
