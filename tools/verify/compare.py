#!/usr/bin/env python3
"""
compare.py - Independent onchain vs IPFS verification for Expansion Punks.

For each punk this script:
  1. Reads the image straight from the onchain Renderer contract
     (`renderSVGWithBackground(tokenId)`) via a raw JSON-RPC eth_call and
     rasterizes the returned rect-SVG to a 24x24 pixel grid.
  2. Fetches the original image the live collection references on IPFS,
     downscales it 504 -> 24 (exact integer factor, nearest-neighbour).
  3. Compares the two pixel-for-pixel, records SHA-256 plus three perceptual
     hashes (average / gradient / DCT) with their onchain<->ipfs Hamming
     distances, classifies the result (exact / rounding / structural), and on
     any difference writes a side-by-side mask PNG.

Everything is cached to disk so re-runs are fast and resumable. The only
third-party dependencies are Pillow and requests (see requirements.txt).
The contract is queried with a hand-rolled eth_call and a hardcoded 4-byte
selector so there is no web3/keccak dependency to audit around.

Usage:
    python verify/compare.py --rpc "$SEPOLIA_RPC_URL"                       # full run
    python verify/compare.py --rpc "$SEPOLIA_RPC_URL" --token 10036         # single punk
    python verify/compare.py --rpc "$SEPOLIA_RPC_URL" --tokens 11177,12101  # explicit list

Output (default --out verify/cache):
    onchain/punk{id}.svg     cached contract response
    ipfs/punk{id}.png        cached IPFS original (504x504)
    masks/punk{id}_mask.png  original | onchain | diff (only when not exact)
    results.json             per-token dataset consumed by build_report.py
"""

import argparse
import hashlib
import io
import json
import math
import os
import re
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image

# Force UTF-8 on Windows consoles.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Defaults (all overridable via CLI)
# ---------------------------------------------------------------------------

DEFAULT_RPC = os.environ.get("SEPOLIA_RPC_URL")
DEFAULT_RENDERER = "0x243C1Ca2d976Eef9fec23675F700814745299E68"

# IPFS image the live ExpansionPunks collection references, via the project's
# Pinata gateway. Matches scripts/fetch_ipfs_data.py.
DEFAULT_GATEWAY = "https://gold-thin-moose-287.mypinata.cloud/ipfs"
DEFAULT_IMAGE_CID = "QmaopicL9xSveFUTeuxj4iQDVBKgdg5k3b2iGkHaMzsK6b"

# keccak256("renderSVGWithBackground(uint256)")[:4]. Verify with:
#   python -c "from eth_hash.auto import keccak; \
#     print(keccak(b'renderSVGWithBackground(uint256)')[:4].hex())"
RENDER_SELECTOR = "3f7671c2"

TOKEN_MIN = 10000
TOKEN_MAX = 19999
IMAGE_SIZE = 24

# A pixel difference whose largest single-channel delta is <= this is treated
# as sub-perceptual alpha rounding (the #DDDDDD80 semi-transparent colour
# composited over the amber background). Anything larger is "structural".
DEFAULT_TOLERANCE = 8

# Perceptual-hash agreement threshold. Each punk is fingerprinted with three
# independent 64-bit perceptual hashes (average / gradient / DCT); we measure
# the Hamming distance between the onchain and original fingerprint. Unlike
# SHA-256 these degrade gracefully, so the distance is a *quantitative* measure
# of perceptual closeness. For 64-bit perceptual hashes the accepted bands are
# 0 = identical, <=5 = near-identical/duplicate, >10 = a different image. We
# treat max(distance) <= this as "perceptually identical".
PERCEPTUAL_THRESHOLD = 5

MAX_RETRIES = 4
BACKOFF_BASE = 1.0
REQUEST_TIMEOUT = 60
DEFAULT_CONCURRENCY = 8
MASK_SCALE = 14
DIFF_HIGHLIGHT = (255, 0, 255)  # magenta

# ---------------------------------------------------------------------------
# Networking helpers
# ---------------------------------------------------------------------------


def _http(url, data=None, headers=None, timeout=REQUEST_TIMEOUT):
    """POST/GET with retries and exponential backoff. Returns response bytes."""
    headers = headers or {}
    last = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, urllib.error.HTTPError, OSError, TimeoutError) as exc:
            last = exc
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_BASE * (2 ** (attempt - 1)))
    raise last


def fetch_onchain_svg(token_id, rpc, renderer):
    """eth_call renderSVGWithBackground(tokenId) and decode the ABI string."""
    call_data = "0x" + RENDER_SELECTOR + format(token_id, "064x")
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_call",
        "params": [{"to": renderer, "data": call_data}, "latest"],
    }
    raw = _http(
        rpc,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "verify/1.0"},
    )
    resp = json.loads(raw)
    if "error" in resp or not resp.get("result") or resp["result"] == "0x":
        raise RuntimeError(f"eth_call failed for {token_id}: {resp.get('error', resp)}")
    out = bytes.fromhex(resp["result"][2:])
    # ABI dynamic string: head[0:32] = data offset, then [len][bytes].
    offset = int.from_bytes(out[0:32], "big")
    length = int.from_bytes(out[offset:offset + 32], "big")
    return out[offset + 32:offset + 32 + length].decode("utf-8")


def fetch_ipfs_png(token_id, gateway, cid):
    url = f"{gateway}/{cid}/punk{token_id}.png"
    return _http(url, headers={"User-Agent": "verify/1.0"})


# ---------------------------------------------------------------------------
# Rasterization (rect-SVG -> 24x24 RGBA)
# Ported from scripts/svg_to_png.py so the verify/ kit ships standalone.
# ---------------------------------------------------------------------------

_RECT_RE = re.compile(
    r'<rect\s+'
    r'(?:x="(\d+)"\s+)?'
    r'(?:y="(\d+)"\s+)?'
    r'width="(\d+)"\s+'
    r'height="(\d+)"\s+'
    r'fill="#([0-9a-fA-F]{6})"'
    r'(?:\s+fill-opacity="([^"]*)")?'
)


def rasterize_svg(svg_text):
    """Render the contract's rect-SVG to a 24x24 RGBA image (source-over)."""
    img = Image.new("RGBA", (IMAGE_SIZE, IMAGE_SIZE), (0, 0, 0, 0))
    px = img.load()
    for m in _RECT_RE.finditer(svg_text):
        x = int(m.group(1)) if m.group(1) else 0
        y = int(m.group(2)) if m.group(2) else 0
        w, h = int(m.group(3)), int(m.group(4))
        hexc = m.group(5)
        r, g, b = int(hexc[0:2], 16), int(hexc[2:4], 16), int(hexc[4:6], 16)
        a = int(round((float(m.group(6)) if m.group(6) else 1.0) * 255))
        for dy in range(h):
            for dx in range(w):
                cx, cy = x + dx, y + dy
                if not (0 <= cx < IMAGE_SIZE and 0 <= cy < IMAGE_SIZE):
                    continue
                if a == 255:
                    px[cx, cy] = (r, g, b, 255)
                else:
                    bg = px[cx, cy]
                    inv = 255 - a
                    out_a = a + (bg[3] * inv) // 255
                    if out_a == 0:
                        px[cx, cy] = (0, 0, 0, 0)
                    else:
                        bba = (bg[3] * inv) // 255
                        px[cx, cy] = (
                            (r * a + bg[0] * bba) // out_a,
                            (g * a + bg[1] * bba) // out_a,
                            (b * a + bg[2] * bba) // out_a,
                            out_a,
                        )
    return img


# ---------------------------------------------------------------------------
# Hashing & comparison
# ---------------------------------------------------------------------------


def rgb_bytes(img):
    """Canonical 24x24 RGB bytes (drop alpha; both images are opaque on amber)."""
    return img.convert("RGB").tobytes()


def sha256_hex(data):
    return hashlib.sha256(data).hexdigest()


def average_hash(img):
    """8x8 grayscale average hash -> 16-hex-char string (glanceable visual hash).
    Bit = pixel brighter than the image mean."""
    small = img.convert("L").resize((8, 8), Image.NEAREST)
    pixels = list(small.getdata())
    mean = sum(pixels) / len(pixels)
    bits = 0
    for p in pixels:
        bits = (bits << 1) | (1 if p >= mean else 0)
    return format(bits, "016x")


def difference_hash(img):
    """8x8 gradient (difference) hash -> 16-hex-char string. Bit = pixel brighter
    than its right neighbour. Encodes local gradients, so a uniform brightness
    shift (e.g. an alpha-rounding nudge) can't flip a bit — only a genuine edge
    change can. The most robust of the three for our rounding case."""
    small = img.convert("L").resize((9, 8), Image.NEAREST)
    px = small.load()
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | (1 if px[x, y] > px[x + 1, y] else 0)
    return format(bits, "016x")


# DCT-II cosine basis for perceptual_hash (N=32 input grid, K=8 low-frequency
# output band), precomputed once.
_PHASH_N = 32
_PHASH_K = 8
_PHASH_BASIS = [
    [math.cos(math.pi * (2 * x + 1) * u / (2 * _PHASH_N)) for x in range(_PHASH_N)]
    for u in range(_PHASH_K)
]


def perceptual_hash(img):
    """DCT-based pHash -> 16-hex-char string. Resize to 32x32 grayscale, take the
    top-left 8x8 low-frequency DCT block, and threshold each coefficient at the
    block median (excluding the DC term). The industry-standard perceptual hash."""
    g = img.convert("L").resize((_PHASH_N, _PHASH_N), Image.LANCZOS)
    px = g.load()
    rows = [[px[x, y] for x in range(_PHASH_N)] for y in range(_PHASH_N)]
    # Separable DCT: transform rows to K frequencies, then columns.
    tmp = [[sum(rows[y][x] * _PHASH_BASIS[u][x] for x in range(_PHASH_N))
            for y in range(_PHASH_N)] for u in range(_PHASH_K)]          # tmp[u][y]
    coef = [[sum(tmp[u][y] * _PHASH_BASIS[v][y] for y in range(_PHASH_N))
             for u in range(_PHASH_K)] for v in range(_PHASH_K)]         # coef[v][u]
    vals = [coef[v][u] for v in range(_PHASH_K) for u in range(_PHASH_K)]
    med = sorted(vals[1:])[len(vals[1:]) // 2]   # median, DC term excluded
    bits = 0
    for val in vals:
        bits = (bits << 1) | (1 if val > med else 0)
    return format(bits, "016x")


def hamming_hex(a, b):
    """Bit (Hamming) distance between two equal-length hex hash strings."""
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def compare_pixels(orig, onchain):
    """Return (num_diff, max_delta, diff_coords, swatch_pairs)."""
    o = orig.convert("RGB").load()
    c = onchain.convert("RGB").load()
    num_diff = 0
    max_delta = 0
    coords = []
    swatches = {}
    for y in range(IMAGE_SIZE):
        for x in range(IMAGE_SIZE):
            op = o[x, y]
            cp = c[x, y]
            if op != cp:
                num_diff += 1
                delta = max(abs(op[i] - cp[i]) for i in range(3))
                max_delta = max(max_delta, delta)
                coords.append([x, y])
                swatches[(op, cp)] = swatches.get((op, cp), 0) + 1
    swatch_pairs = [
        {"original": list(k[0]), "onchain": list(k[1]), "count": v}
        for k, v in sorted(swatches.items(), key=lambda kv: -kv[1])
    ]
    return num_diff, max_delta, coords, swatch_pairs


def classify(num_diff, max_delta, tolerance):
    if num_diff == 0:
        return "exact"
    if max_delta <= tolerance:
        return "rounding"
    return "structural"


def write_mask(path, orig, onchain, coords):
    """Side-by-side: original | onchain | diff-overlay, scaled up."""
    s = MASK_SCALE
    panel = IMAGE_SIZE * s
    canvas = Image.new("RGB", (panel * 3 + 8, panel), (24, 24, 24))
    canvas.paste(orig.convert("RGB").resize((panel, panel), Image.NEAREST), (0, 0))
    canvas.paste(onchain.convert("RGB").resize((panel, panel), Image.NEAREST), (panel + 4, 0))
    overlay = onchain.convert("RGB").copy()
    op = overlay.load()
    # dim, then light up diff pixels in magenta
    for y in range(IMAGE_SIZE):
        for x in range(IMAGE_SIZE):
            r, g, b = op[x, y]
            op[x, y] = (r // 3, g // 3, b // 3)
    for x, y in coords:
        op[x, y] = DIFF_HIGHLIGHT
    canvas.paste(overlay.resize((panel, panel), Image.NEAREST), (panel * 2 + 8, 0))
    canvas.save(path)


# ---------------------------------------------------------------------------
# Per-token worker
# ---------------------------------------------------------------------------


def process_token(token_id, cfg):
    svg_path = os.path.join(cfg["out"], "onchain", f"punk{token_id}.svg")
    png_path = os.path.join(cfg["out"], "ipfs", f"punk{token_id}.png")

    # onchain (cached)
    if os.path.exists(svg_path):
        with open(svg_path, encoding="utf-8") as f:
            svg = f.read()
    else:
        svg = fetch_onchain_svg(token_id, cfg["rpc"], cfg["renderer"])
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(svg)

    # ipfs (cached)
    if os.path.exists(png_path):
        with open(png_path, "rb") as f:
            png_bytes = f.read()
    else:
        png_bytes = fetch_ipfs_png(token_id, cfg["gateway"], cfg["cid"])
        with open(png_path, "wb") as f:
            f.write(png_bytes)

    onchain_img = rasterize_svg(svg)
    orig_full = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    orig_img = orig_full.resize((IMAGE_SIZE, IMAGE_SIZE), Image.NEAREST)

    onchain_rgb = rgb_bytes(onchain_img)
    orig_rgb = rgb_bytes(orig_img)
    num_diff, max_delta, coords, swatches = compare_pixels(orig_img, onchain_img)
    cls = classify(num_diff, max_delta, cfg["tolerance"])

    mask_rel = None
    if cls != "exact":
        mask_rel = os.path.join("masks", f"punk{token_id}_mask.png")
        write_mask(os.path.join(cfg["out"], mask_rel), orig_img, onchain_img, coords)

    # Three independent perceptual fingerprints + their onchain<->ipfs distances.
    on_a, ip_a = average_hash(onchain_img), average_hash(orig_img)
    on_d, ip_d = difference_hash(onchain_img), difference_hash(orig_img)
    on_p, ip_p = perceptual_hash(onchain_img), perceptual_hash(orig_img)
    ahash_dist = hamming_hex(on_a, ip_a)
    dhash_dist = hamming_hex(on_d, ip_d)
    phash_dist = hamming_hex(on_p, ip_p)
    max_perc = max(ahash_dist, dhash_dist, phash_dist)

    return {
        "tokenId": token_id,
        "classification": cls,
        "match": cls == "exact",
        "onchain_sha256": sha256_hex(onchain_rgb),
        "ipfs_sha256": sha256_hex(orig_rgb),
        "onchain_ahash": on_a,
        "ipfs_ahash": ip_a,
        "onchain_dhash": on_d,
        "ipfs_dhash": ip_d,
        "onchain_phash": on_p,
        "ipfs_phash": ip_p,
        "ahash_dist": ahash_dist,
        "dhash_dist": dhash_dist,
        "phash_dist": phash_dist,
        "max_perceptual_dist": max_perc,
        "perceptual_match": max_perc <= PERCEPTUAL_THRESHOLD,
        "num_diff_pixels": num_diff,
        "max_channel_delta": max_delta,
        "swatch_pairs": swatches if cls == "rounding" else (swatches if cls == "structural" else []),
        "diff_coords": coords if cls == "structural" else [],
        "mask": mask_rel.replace("\\", "/") if mask_rel else None,
    }


# ---------------------------------------------------------------------------
# CLI / orchestration
# ---------------------------------------------------------------------------


def parse_tokens(spec):
    if not spec:
        return list(range(TOKEN_MIN, TOKEN_MAX + 1))
    ids = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-")
            ids.extend(range(int(a), int(b) + 1))
        elif part:
            ids.append(int(part))
    return ids


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Verify onchain punks against IPFS originals.")
    p.add_argument("--token", type=int, help="Single token id (shortcut).")
    p.add_argument("--tokens", type=str, help="Comma list and/or ranges, e.g. 10000-10099,11177.")
    p.add_argument(
        "--rpc",
        default=DEFAULT_RPC,
        required=DEFAULT_RPC is None,
        help="JSON-RPC URL (or set SEPOLIA_RPC_URL)",
    )
    p.add_argument("--renderer", default=DEFAULT_RENDERER)
    p.add_argument("--gateway", default=DEFAULT_GATEWAY)
    p.add_argument("--cid", default=DEFAULT_IMAGE_CID)
    p.add_argument("--tolerance", type=int, default=DEFAULT_TOLERANCE)
    p.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    p.add_argument("--out", default=os.path.join("verify", "cache"))
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    cfg = {
        "rpc": args.rpc,
        "renderer": args.renderer,
        "gateway": args.gateway,
        "cid": args.cid,
        "tolerance": args.tolerance,
        "out": args.out,
    }
    for sub in ("onchain", "ipfs", "masks"):
        os.makedirs(os.path.join(cfg["out"], sub), exist_ok=True)

    if args.token is not None:
        tokens = [args.token]
    else:
        tokens = parse_tokens(args.tokens)

    print("=" * 64)
    print("Expansion Punks onchain vs IPFS verification")
    print("=" * 64)
    print(f"  Renderer   : {cfg['renderer']}")
    print(f"  RPC        : {cfg['rpc']}")
    print(f"  IPFS       : {cfg['gateway']}/{cfg['cid']}")
    print(f"  Tolerance  : {cfg['tolerance']} (rounding band, per channel)")
    print(f"  Tokens     : {len(tokens)}")
    print(f"  Output     : {cfg['out']}")
    print("=" * 64)

    results = {}
    errors = []
    counts = {"exact": 0, "rounding": 0, "structural": 0}
    done = 0
    total = len(tokens)

    single = len(tokens) == 1
    workers = 1 if single else max(1, args.concurrency)

    def run(tid):
        return tid, process_token(tid, cfg)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(run, t): t for t in tokens}
        for fut in as_completed(futures):
            tid = futures[fut]
            try:
                _, rec = fut.result()
                results[tid] = rec
                counts[rec["classification"]] += 1
            except Exception as exc:
                errors.append((tid, str(exc)))
            done += 1
            if done % 100 == 0 or done == total:
                print(
                    f"  {done}/{total}  exact={counts['exact']} "
                    f"rounding={counts['rounding']} structural={counts['structural']} "
                    f"errors={len(errors)}"
                )

    ordered = [results[t] for t in sorted(results)]
    max_perc_all = max((r["max_perceptual_dist"] for r in ordered), default=0)
    perc_exceptions = sum(1 for r in ordered if not r["perceptual_match"])
    summary = {
        "renderer": cfg["renderer"],
        "rpc_host": cfg["rpc"].split("/v3/")[0],
        "ipfs": f"{cfg['gateway']}/{cfg['cid']}",
        "tolerance": cfg["tolerance"],
        "perceptual_threshold": PERCEPTUAL_THRESHOLD,
        "total": len(ordered),
        "exact": counts["exact"],
        "rounding": counts["rounding"],
        "structural": counts["structural"],
        "max_perceptual_dist": max_perc_all,
        "perceptual_exceptions": perc_exceptions,
        "errors": len(errors),
    }
    out_doc = {"summary": summary, "tokens": ordered}
    results_path = os.path.join(cfg["out"], "results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(out_doc, f, indent=2)

    print("=" * 64)
    print("SUMMARY")
    print(f"  exact      : {counts['exact']}")
    print(f"  rounding   : {counts['rounding']}  (<= {cfg['tolerance']}/channel)")
    print(f"  structural : {counts['structural']}")
    print(f"  perceptual : max distance {max_perc_all}/64 across all punks "
          f"(threshold {PERCEPTUAL_THRESHOLD}), {perc_exceptions} exception(s)")
    if errors:
        print(f"  errors     : {len(errors)}")
        for tid, msg in errors[:10]:
            print(f"      {tid}: {msg}")

    if single:
        rec = ordered[0]
        print("-" * 64)
        print(f"  punk #{rec['tokenId']}  -> {rec['classification'].upper()}")
        print(f"  onchain sha256 : {rec['onchain_sha256']}")
        print(f"  ipfs    sha256 : {rec['ipfs_sha256']}")
        print(f"  match          : {rec['match']}")
        print(f"  diff pixels    : {rec['num_diff_pixels']}  max delta: {rec['max_channel_delta']}")
        print(f"  perceptual     : aHash Δ{rec['ahash_dist']} · dHash Δ{rec['dhash_dist']} "
              f"· pHash Δ{rec['phash_dist']}  (threshold {PERCEPTUAL_THRESHOLD} -> "
              f"{'identical' if rec['perceptual_match'] else 'EXCEEDS'})")
        if rec["mask"]:
            print(f"  mask           : {os.path.join(cfg['out'], rec['mask'])}")

    print(f"  results    : {results_path}")
    print("=" * 64)

    if counts["structural"] > 0 or errors or perc_exceptions > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
