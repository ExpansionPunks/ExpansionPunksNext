"use client";

import { useEffect, useRef, useState } from "react";
import {
  PERCEPTUAL_THRESHOLD,
  TOLERANCE,
  getVerifyClient,
  ipfsProxyPath,
  rendererAbi,
  verifyTarget,
} from "@/lib/verify-config";

const SIZE = 24;

type Classification = "exact" | "rounding" | "structural";

type SwatchPair = { orig: [number, number, number]; onchain: [number, number, number]; count: number };

type Perceptual = { ahash: number; dhash: number; phash: number; max: number; match: boolean };

type VerifyResult = {
  classification: Classification;
  numDiff: number;
  maxDelta: number;
  swatches: SwatchPair[];
  onchainHash: string;
  ipfsHash: string;
  perceptual: Perceptual;
};

// The original IPFS PNGs carry gAMA + cHRM chunks. An <img> decode honors that
// color management, shifting e.g. the #ffbf00 amber background to #ffc000 and
// saturated trait colors by more — which the reference pipeline (Pillow, raw
// palette) does not. That produces hundreds of spurious 1-level diffs on the
// flat background and falsely trips a "structural" verdict. Decoding with
// colorSpaceConversion:"none" makes the browser ignore the embedded profile, so
// the pixels match the raw values the onchain SVG render is compared against.
async function loadRawBitmap(src: string): Promise<ImageBitmap> {
  // cache: "no-store" — always compare against the freshly proxied original.
  // The proxy strips the PNG's color chunks; an earlier (profiled) response may
  // still be in the HTTP cache under this URL with a long immutable max-age, so
  // we must bypass the cache or the browser would reuse the color-managed image.
  const resp = await fetch(src, { cache: "no-store" });
  if (!resp.ok) throw new Error(`image fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  return createImageBitmap(blob, { colorSpaceConversion: "none" });
}

// Downscale the original to 24x24 by sampling, NOT by drawImage. GPU-accelerated
// canvas downscaling at 21:1 is not bit-exact even with imageSmoothingEnabled
// off — it injects ±1 noise into the flat fields, which the reference pipeline
// (Pillow NEAREST) does not. Instead copy the source 1:1 (an opaque straight
// copy is exact), read it back, and pick one source pixel per output pixel at
// Pillow's NEAREST position. The originals are an exact integer upscale, so this
// reproduces the published report's pixels precisely.
function sampleTo24(img: ImageBitmap): ImageData {
  const w = img.width;
  const h = img.height;
  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  const fctx = full.getContext("2d", { willReadFrequently: true })!;
  fctx.imageSmoothingEnabled = false;
  fctx.drawImage(img, 0, 0);
  const src = fctx.getImageData(0, 0, w, h).data;

  const out = new ImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    const sy = Math.floor(((y + 0.5) * h) / SIZE);
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.floor(((x + 0.5) * w) / SIZE);
      const si = (sy * w + sx) * 4;
      const di = (y * SIZE + x) * 4;
      out.data[di] = src[si];
      out.data[di + 1] = src[si + 1];
      out.data[di + 2] = src[si + 2];
      out.data[di + 3] = src[si + 3];
    }
  }
  return out;
}

// Composite the contract's rect-SVG to 24x24 in JS, using the exact integer
// source-over math from the reference pipeline (verify/compare.py rasterize_svg).
// We do NOT hand the SVG to the browser's rasterizer — it renders at device-pixel
// scale and downsamples, speckling the flat fields with ±1 noise and blending the
// semi-transparent rects differently than the report. Compositing here makes the
// onchain image bit-identical to the published report's onchain.
const RECT_RE =
  /<rect\s+(?:x="(\d+)"\s+)?(?:y="(\d+)"\s+)?width="(\d+)"\s+height="(\d+)"\s+fill="#([0-9a-fA-F]{6})"(?:\s+fill-opacity="([^"]*)")?/g;

function rasterizeSvgExact(svg: string): ImageData {
  const out = new ImageData(SIZE, SIZE); // RGBA, initialized to transparent black
  RECT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RECT_RE.exec(svg)) !== null) {
    const x = m[1] ? parseInt(m[1], 10) : 0;
    const y = m[2] ? parseInt(m[2], 10) : 0;
    const w = parseInt(m[3], 10);
    const h = parseInt(m[4], 10);
    const r = parseInt(m[5].slice(0, 2), 16);
    const g = parseInt(m[5].slice(2, 4), 16);
    const b = parseInt(m[5].slice(4, 6), 16);
    const a = Math.round((m[6] !== undefined ? parseFloat(m[6]) : 1) * 255);
    for (let dy = 0; dy < h; dy++) {
      const cy = y + dy;
      if (cy < 0 || cy >= SIZE) continue;
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx;
        if (cx < 0 || cx >= SIZE) continue;
        const i = (cy * SIZE + cx) * 4;
        if (a === 255) {
          out.data[i] = r;
          out.data[i + 1] = g;
          out.data[i + 2] = b;
          out.data[i + 3] = 255;
        } else {
          const bgA = out.data[i + 3];
          const bba = Math.floor((bgA * (255 - a)) / 255);
          const outA = a + bba;
          if (outA === 0) {
            out.data[i] = 0;
            out.data[i + 1] = 0;
            out.data[i + 2] = 0;
            out.data[i + 3] = 0;
          } else {
            out.data[i] = Math.floor((r * a + out.data[i] * bba) / outA);
            out.data[i + 1] = Math.floor((g * a + out.data[i + 1] * bba) / outA);
            out.data[i + 2] = Math.floor((b * a + out.data[i + 2] * bba) / outA);
            out.data[i + 3] = outA;
          }
        }
      }
    }
  }
  return out;
}

function rgbBytes(data: ImageData): Uint8Array {
  const out = new Uint8Array(SIZE * SIZE * 3);
  for (let i = 0, j = 0; i < data.data.length; i += 4, j += 3) {
    out[j] = data.data[i];
    out[j + 1] = data.data[i + 1];
    out[j + 2] = data.data[i + 2];
  }
  return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- perceptual hashing (mirrors verify/compare.py; computed identically on
// both images so the in-browser Hamming distance is internally consistent) ----

function grayResize(data: ImageData, w: number, h: number, smooth: boolean): number[] {
  const src = document.createElement("canvas");
  src.width = SIZE;
  src.height = SIZE;
  src.getContext("2d")!.putImageData(data, 0, 0);
  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(src, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Array<number>(w * h);
  for (let i = 0, j = 0; j < w * h; i += 4, j++) {
    gray[j] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  }
  return gray;
}

// aHash: 8x8, bit = pixel >= mean.
function aHashBits(data: ImageData): number[] {
  const g = grayResize(data, 8, 8, false);
  const mean = g.reduce((a, b) => a + b, 0) / g.length;
  return g.map((v) => (v >= mean ? 1 : 0));
}

// dHash: 9x8, bit = pixel brighter than its right neighbour.
function dHashBits(data: ImageData): number[] {
  const g = grayResize(data, 9, 8, false);
  const bits: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) bits.push(g[y * 9 + x] > g[y * 9 + x + 1] ? 1 : 0);
  }
  return bits;
}

const PN = 32;
const PK = 8;
const PBASIS: number[][] = Array.from({ length: PK }, (_, u) =>
  Array.from({ length: PN }, (_, x) => Math.cos((Math.PI * (2 * x + 1) * u) / (2 * PN))),
);

// pHash: 8x8 low-frequency DCT block thresholded at its median (DC excluded).
function pHashBits(data: ImageData): number[] {
  const g = grayResize(data, PN, PN, true);
  const rows: number[][] = [];
  for (let y = 0; y < PN; y++) {
    const r: number[] = [];
    for (let x = 0; x < PN; x++) r.push(g[y * PN + x]);
    rows.push(r);
  }
  const tmp: number[][] = []; // tmp[u][y]
  for (let u = 0; u < PK; u++) {
    const ty: number[] = [];
    for (let y = 0; y < PN; y++) {
      let s = 0;
      for (let x = 0; x < PN; x++) s += rows[y][x] * PBASIS[u][x];
      ty.push(s);
    }
    tmp.push(ty);
  }
  const vals: number[] = [];
  for (let v = 0; v < PK; v++) {
    for (let u = 0; u < PK; u++) {
      let s = 0;
      for (let y = 0; y < PN; y++) s += tmp[u][y] * PBASIS[v][y];
      vals.push(s);
    }
  }
  const sorted = vals.slice(1).sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  return vals.map((v) => (v > med ? 1 : 0));
}

function hammingBits(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

function perceptualDistances(orig: ImageData, onchain: ImageData): Perceptual {
  const ahash = hammingBits(aHashBits(onchain), aHashBits(orig));
  const dhash = hammingBits(dHashBits(onchain), dHashBits(orig));
  const phash = hammingBits(pHashBits(onchain), pHashBits(orig));
  const max = Math.max(ahash, dhash, phash);
  return { ahash, dhash, phash, max, match: max <= PERCEPTUAL_THRESHOLD };
}

function paintCanvas(canvas: HTMLCanvasElement | null, data: ImageData) {
  if (!canvas) return;
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext("2d")!.putImageData(data, 0, 0);
}

function paintDiff(canvas: HTMLCanvasElement | null, onchain: ImageData, mask: boolean[]) {
  if (!canvas) return;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const out = new ImageData(SIZE, SIZE);
  for (let p = 0; p < SIZE * SIZE; p++) {
    const i = p * 4;
    if (mask[p]) {
      out.data[i] = 255;
      out.data[i + 1] = 0;
      out.data[i + 2] = 255;
    } else {
      out.data[i] = onchain.data[i] / 3;
      out.data[i + 1] = onchain.data[i + 1] / 3;
      out.data[i + 2] = onchain.data[i + 2] / 3;
    }
    out.data[i + 3] = 255;
  }
  canvas.getContext("2d")!.putImageData(out, 0, 0);
}

function diffImages(orig: ImageData, onchain: ImageData) {
  let numDiff = 0;
  let maxDelta = 0;
  const mask: boolean[] = new Array(SIZE * SIZE).fill(false);
  const swatchMap = new Map<string, SwatchPair>();
  for (let p = 0; p < SIZE * SIZE; p++) {
    const i = p * 4;
    const o: [number, number, number] = [orig.data[i], orig.data[i + 1], orig.data[i + 2]];
    const c: [number, number, number] = [onchain.data[i], onchain.data[i + 1], onchain.data[i + 2]];
    if (o[0] !== c[0] || o[1] !== c[1] || o[2] !== c[2]) {
      numDiff++;
      mask[p] = true;
      const delta = Math.max(Math.abs(o[0] - c[0]), Math.abs(o[1] - c[1]), Math.abs(o[2] - c[2]));
      if (delta > maxDelta) maxDelta = delta;
      const key = `${o.join(",")}|${c.join(",")}`;
      const existing = swatchMap.get(key);
      if (existing) existing.count++;
      else swatchMap.set(key, { orig: o, onchain: c, count: 1 });
    }
  }
  const swatches = [...swatchMap.values()].sort((a, b) => b.count - a.count);
  return { numDiff, maxDelta, mask, swatches };
}

const VERDICT: Record<Classification, { label: string; blurb: string; cls: string }> = {
  exact: {
    label: "Exact match",
    blurb: "Every pixel from the contract is byte-identical to the original IPFS image.",
    cls: "exact",
  },
  rounding: {
    label: "Visually identical",
    blurb:
      "The only differences are sub-perceptual alpha rounding where the semi-transparent #DDDDDD80 colour is composited over the amber background. The colour pairs below show how close.",
    cls: "rounding",
  },
  structural: {
    label: "Structural difference",
    blurb: "Pixels differ beyond the alpha-rounding band. See the highlighted diff.",
    cls: "structural",
  },
};

function hex([r, g, b]: [number, number, number]) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function PunkVerifier({ tokenId }: { tokenId: number }) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const origRef = useRef<HTMLCanvasElement>(null);
  const onchainRef = useRef<HTMLCanvasElement>(null);
  const diffRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = getVerifyClient();
        const [svg, origImg] = await Promise.all([
          client.readContract({
            address: verifyTarget.renderer,
            abi: rendererAbi,
            functionName: "renderSVGWithBackground",
            args: [BigInt(tokenId)],
          }) as Promise<string>,
          loadRawBitmap(ipfsProxyPath(tokenId)),
        ]);
        if (cancelled) return;

        const onchainData = rasterizeSvgExact(svg);
        const origData = sampleTo24(origImg);
        if (cancelled) return;

        const { numDiff, maxDelta, mask, swatches } = diffImages(origData, onchainData);
        const [onchainHash, ipfsHash] = await Promise.all([
          sha256Hex(rgbBytes(onchainData)),
          sha256Hex(rgbBytes(origData)),
        ]);
        if (cancelled) return;

        paintCanvas(origRef.current, origData);
        paintCanvas(onchainRef.current, onchainData);
        paintDiff(diffRef.current, onchainData, mask);

        const classification: Classification =
          numDiff === 0 ? "exact" : maxDelta <= TOLERANCE ? "rounding" : "structural";
        const perceptual = perceptualDistances(origData, onchainData);

        setResult({ classification, numDiff, maxDelta, swatches, onchainHash, ipfsHash, perceptual });
        setStatus("done");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return (
    <section className="verify">
      <div className="verify-inner">
        {status === "error" ? (
          <p className="verify-error">
            Could not verify punk #{tokenId}: {error}. Try again in a moment — the read hits a public
            RPC and the IPFS gateway.
          </p>
        ) : null}

        <div className="verify-panels">
          <figure>
            <canvas ref={origRef} className="verify-canvas" aria-label="Original IPFS image" />
            <figcaption>Original (IPFS)</figcaption>
          </figure>
          <figure>
            <canvas ref={onchainRef} className="verify-canvas" aria-label="Onchain render" />
            <figcaption>Onchain (contract)</figcaption>
          </figure>
          <figure>
            <canvas ref={diffRef} className="verify-canvas" aria-label="Pixel difference" />
            <figcaption>Difference</figcaption>
          </figure>
        </div>

        {status === "loading" ? <p className="verify-status">Reading from the contract and IPFS…</p> : null}

        {result ? (
          <div className={`verify-verdict ${VERDICT[result.classification].cls}`}>
            <strong>{VERDICT[result.classification].label}</strong>
            <p>{VERDICT[result.classification].blurb}</p>
            <p className="verify-meta">
              {result.numDiff} differing pixel{result.numDiff === 1 ? "" : "s"} · max delta{" "}
              {result.maxDelta}/channel · reading from {verifyTarget.label}
            </p>
          </div>
        ) : null}

        {result ? (
          <div className={`verify-perceptual ${result.perceptual.match ? "ok" : "warn"}`}>
            <h3>Perceptual hashes</h3>
            <p className="verify-perceptual-row">
              <span>
                aHash <b>Δ{result.perceptual.ahash}</b>
              </span>
              <span>
                dHash <b>Δ{result.perceptual.dhash}</b>
              </span>
              <span>
                pHash <b>Δ{result.perceptual.phash}</b>
              </span>
            </p>
            <p className="verify-meta">
              Hamming distance, onchain vs original (out of 64). At the threshold of{" "}
              {PERCEPTUAL_THRESHOLD} (≤5 = near-identical),{" "}
              {result.perceptual.match
                ? "this punk is perceptually identical to its original."
                : "this punk exceeds the perceptual-identity threshold."}
            </p>
          </div>
        ) : null}

        {result && result.swatches.length ? (
          <div className="verify-swatches">
            <h3>Colour pairs (original → onchain)</h3>
            <ul>
              {result.swatches.slice(0, 12).map((s, i) => (
                <li key={i}>
                  <span className="swatch-pair" aria-hidden="true">
                    <span style={{ background: hex(s.orig) }} />
                    <span style={{ background: hex(s.onchain) }} />
                  </span>
                  <code>
                    {hex(s.orig)} → {hex(s.onchain)}
                  </code>
                  <em>×{s.count}</em>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result ? (
          <dl className="verify-hashes">
            <dt>Onchain SHA-256</dt>
            <dd>
              <code>{result.onchainHash}</code>
            </dd>
            <dt>IPFS SHA-256</dt>
            <dd>
              <code>{result.ipfsHash}</code>
            </dd>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
