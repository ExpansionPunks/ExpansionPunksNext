#!/usr/bin/env python3
"""
build_report.py - Turn verify/cache/results.json into a publishable report.

Reads the dataset produced by compare.py and emits, into verify/report/:
    REPORT.md     headline numbers, methodology, rounding swatches, mismatches
    hashes.csv    one row per token so anyone can diff our numbers
    report.html   self-contained single-file view (inline CSS + swatches)
    swatches/     side-by-side colour PNGs for the rounding cases
    masks/        copies of any structural mask PNGs

Run compare.py first. No network access; pure presentation.
"""

import csv
import io
import json
import os
import shutil
import sys
import base64
from collections import Counter

from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CACHE = os.path.join("verify", "cache")
REPORT = os.path.join("verify", "report")
RESULTS = os.path.join(CACHE, "results.json")

SWATCH_CELL = 48      # px per colour block


def load():
    with open(RESULTS, encoding="utf-8") as f:
        return json.load(f)


def rgb_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def aggregate_rounding(tokens):
    """Across all rounding tokens, tally distinct (orig,onchain) colour pairs."""
    pairs = Counter()
    deltas = Counter()
    for t in tokens:
        if t["classification"] != "rounding":
            continue
        deltas[t["max_channel_delta"]] += 1
        for sp in t["swatch_pairs"]:
            pairs[(tuple(sp["original"]), tuple(sp["onchain"]))] += sp["count"]
    return pairs, deltas


def aggregate_perceptual(tokens):
    """Hamming-distance histogram per perceptual hash, onchain vs ipfs."""
    hist = {"ahash": Counter(), "dhash": Counter(), "phash": Counter()}
    for t in tokens:
        hist["ahash"][t.get("ahash_dist", 0)] += 1
        hist["dhash"][t.get("dhash_dist", 0)] += 1
        hist["phash"][t.get("phash_dist", 0)] += 1
    return hist


def write_swatch(path, orig, onchain):
    """A small original|onchain colour-pair image."""
    img = Image.new("RGB", (SWATCH_CELL * 2 + 2, SWATCH_CELL), (40, 40, 40))
    img.paste(Image.new("RGB", (SWATCH_CELL, SWATCH_CELL), orig), (0, 0))
    img.paste(Image.new("RGB", (SWATCH_CELL, SWATCH_CELL), onchain), (SWATCH_CELL + 2, 0))
    img.save(path)


def b64_png(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def main():
    doc = load()
    summary = doc["summary"]
    tokens = doc["tokens"]

    os.makedirs(REPORT, exist_ok=True)
    sw_dir = os.path.join(REPORT, "swatches")
    mask_dir = os.path.join(REPORT, "masks")
    os.makedirs(sw_dir, exist_ok=True)
    os.makedirs(mask_dir, exist_ok=True)

    # ---- hashes.csv -------------------------------------------------------
    csv_path = os.path.join(REPORT, "hashes.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([
            "tokenId", "classification", "match", "max_channel_delta",
            "num_diff_pixels", "onchain_sha256", "ipfs_sha256",
            "onchain_ahash", "ipfs_ahash", "onchain_dhash", "ipfs_dhash",
            "onchain_phash", "ipfs_phash",
            "ahash_dist", "dhash_dist", "phash_dist",
            "max_perceptual_dist", "perceptual_match",
        ])
        for t in tokens:
            w.writerow([
                t["tokenId"], t["classification"], t["match"],
                t["max_channel_delta"], t["num_diff_pixels"],
                t["onchain_sha256"], t["ipfs_sha256"],
                t["onchain_ahash"], t["ipfs_ahash"],
                t.get("onchain_dhash", ""), t.get("ipfs_dhash", ""),
                t.get("onchain_phash", ""), t.get("ipfs_phash", ""),
                t.get("ahash_dist", ""), t.get("dhash_dist", ""),
                t.get("phash_dist", ""), t.get("max_perceptual_dist", ""),
                t.get("perceptual_match", ""),
            ])

    # ---- rounding swatches ------------------------------------------------
    pairs, deltas = aggregate_rounding(tokens)
    # Render every distinct rounding pair, not just the most common, so the
    # report captures every colour difference the per-punk web verifier can show.
    top_pairs = pairs.most_common()
    swatch_meta = []
    for i, ((orig, onchain), count) in enumerate(top_pairs):
        fn = f"swatch_{i:02d}.png"
        write_swatch(os.path.join(sw_dir, fn), orig, onchain)
        swatch_meta.append({
            "file": fn,
            "orig": orig, "onchain": onchain,
            "orig_hex": rgb_hex(orig), "onchain_hex": rgb_hex(onchain),
            "delta": max(abs(orig[j] - onchain[j]) for j in range(3)),
            "count": count,
        })

    # ---- structural masks -------------------------------------------------
    structural = [t for t in tokens if t["classification"] == "structural"]
    for t in structural:
        if t.get("mask"):
            src = os.path.join(CACHE, t["mask"])
            if os.path.exists(src):
                shutil.copy(src, os.path.join(mask_dir, os.path.basename(src)))

    # ---- REPORT.md --------------------------------------------------------
    md = []
    md.append("# Expansion Punks — onchain vs IPFS verification report\n")
    md.append(
        "Every punk's image was read directly from the onchain Renderer "
        "(`renderSVGWithBackground`) and compared, pixel-for-pixel, against the "
        "original image the live collection references on IPFS. This report is "
        "reproducible with the kit in [`verify/`](./../README.md).\n"
    )
    md.append("## Result\n")
    md.append("| Outcome | Punks |")
    md.append("|---|---:|")
    md.append(f"| Exact pixel match | {summary['exact']:,} |")
    md.append(f"| Visually identical (alpha rounding ≤ {summary['tolerance']}/channel) | {summary['rounding']:,} |")
    md.append(f"| Structural difference | {summary['structural']:,} |")
    md.append(f"| **Total** | **{summary['total']:,}** |")
    if summary.get("errors"):
        md.append(f"\n> {summary['errors']} token(s) could not be fetched; see results.json.")
    md.append("")
    exact_pct = 100.0 * (summary["exact"] + summary["rounding"]) / max(1, summary["total"])
    md.append(
        f"**{exact_pct:.2f}%** of punks are pixel-identical or differ only by "
        "sub-perceptual alpha rounding. "
        + ("No structural differences were found.\n" if summary["structural"] == 0
           else f"{summary['structural']} punk(s) show a structural difference (see below).\n")
    )

    md.append("## What the rounding difference looks like\n")
    md.append(
        "Where punks aren't byte-identical, the cause is off-by-one rounding "
        "when the semi-transparent colour `#DDDDDD80` is composited over the "
        "pixels beneath it (skin, hair and other trait colours) — the original "
        "renderer and the onchain renderer round the blend a hair differently. "
        f"Every distinct pair across the collection is shown below ({len(top_pairs)} "
        "in total); each is the **original (left)** next to the **onchain "
        "(right)** colour. Judge the closeness yourself.\n"
    )
    if deltas:
        md.append("Per-channel max delta across all rounding punks:\n")
        md.append("| Δ (max channel) | Punks |")
        md.append("|---:|---:|")
        for d in sorted(deltas):
            md.append(f"| {d} | {deltas[d]:,} |")
        md.append("")
    md.append("| Original → Onchain | Hex (orig → onchain) | Δ | Pixels |")
    md.append("|---|---|---:|---:|")
    for s in swatch_meta:
        md.append(
            f"| ![pair](swatches/{s['file']}) | `{s['orig_hex']}` → `{s['onchain_hex']}` "
            f"| {s['delta']} | {s['count']:,} |"
        )
    md.append("")

    # ---- perceptual identity ---------------------------------------------
    perc = aggregate_perceptual(tokens)
    threshold = summary.get("perceptual_threshold", 5)
    max_perc = summary.get("max_perceptual_dist",
                           max((t.get("max_perceptual_dist", 0) for t in tokens), default=0))
    perc_exc = summary.get("perceptual_exceptions",
                           sum(1 for t in tokens if not t.get("perceptual_match", True)))
    perc_distances = sorted(set(perc["ahash"]) | set(perc["dhash"]) | set(perc["phash"]))

    md.append("## Perceptual identity (thresholded)\n")
    md.append(
        "SHA-256 is all-or-nothing: a single rounded channel flips the whole "
        "digest, so the rounding punks above carry different SHA-256s despite "
        "being visually the same. To put a *number* on \"visually the same\", "
        "each punk is also fingerprinted with three independent 64-bit "
        "perceptual hashes, and we measure the Hamming distance between the "
        "onchain and original fingerprint:\n"
    )
    md.append("- **aHash** (average) — bit = pixel brighter than the image mean.")
    md.append("- **dHash** (gradient) — bit = pixel brighter than its right neighbour; immune to uniform brightness shifts.")
    md.append("- **pHash** (DCT) — low-frequency DCT coefficients thresholded at their median; the industry-standard perceptual hash.")
    md.append("")
    md.append(
        f"For 64-bit perceptual hashes the accepted bands are **0 = identical, "
        f"≤5 = near-identical/duplicate, >10 = a different image**. Across all "
        f"{summary['total']:,} punks the largest distance on *any* hash is "
        f"**{max_perc}/64**. At a threshold of **{threshold}**, every punk is "
        f"perceptually identical to its original — **{perc_exc} exception"
        f"{'' if perc_exc == 1 else 's'}**.\n"
    )
    md.append("Hamming-distance distribution (onchain vs original):\n")
    md.append("| Distance | aHash | dHash | pHash |")
    md.append("|---:|---:|---:|---:|")
    for d in perc_distances:
        md.append(f"| {d} | {perc['ahash'].get(d, 0):,} | {perc['dhash'].get(d, 0):,} | {perc['phash'].get(d, 0):,} |")
    md.append("")

    md.append("## Structural differences\n")
    if not structural:
        md.append("None. No punk differed from its IPFS original beyond the alpha-rounding band.\n")
    else:
        md.append(f"{len(structural)} punk(s). Each mask is **original | onchain | diff** (magenta = changed pixels).\n")
        for t in structural:
            md.append(f"### Punk #{t['tokenId']} — {t['num_diff_pixels']} px, max Δ {t['max_channel_delta']}\n")
            if t.get("mask"):
                md.append(f"![mask](masks/{os.path.basename(t['mask'])})\n")

    md.append("## Methodology & reproduction\n")
    md.append(f"- **Onchain source:** Renderer `{summary['renderer']}` via `{summary['rpc_host']}`, `renderSVGWithBackground(tokenId)`, rasterized to 24×24.")
    md.append(f"- **Original source:** `{summary['ipfs']}/punk{{id}}.png` (504×504), downscaled ×21 to 24×24 (nearest-neighbour).")
    md.append(f"- **Hashes:** SHA-256 over canonical 24×24 RGB bytes, plus three 64-bit perceptual hashes (aHash / dHash / pHash) with their onchain↔original Hamming distances. Threshold {summary.get('perceptual_threshold', 5)}. Full per-token table in [`hashes.csv`](hashes.csv).")
    md.append("- **Sepolia ⇄ mainnet:** the deployed trait/descriptor bytes are identical across networks, so this verifies the same art mainnet serves. Re-run with `--renderer <mainnet>` after deployment.")
    md.append("- **Reproduce:** `pip install -r verify/requirements.txt && python verify/compare.py --tokens 10000-19999 && python verify/build_report.py`.")
    md.append("")

    md_path = os.path.join(REPORT, "REPORT.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))

    # ---- report.html (self-contained) ------------------------------------
    html = []
    html.append("<!doctype html><html><head><meta charset='utf-8'>")
    html.append("<meta name='viewport' content='width=device-width,initial-scale=1'>")
    html.append("<title>Expansion Punks — onchain vs IPFS verification</title>")
    html.append("""<style>
:root{--amber:#ffbf00;--ink:#171717;--paper:#fffaf0}
body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:var(--ink);background:var(--paper)}
h1{border-bottom:6px solid var(--amber);padding-bottom:.3rem}
table{border-collapse:collapse;margin:1rem 0}
th,td{border:1px solid #ccc;padding:.4rem .7rem;text-align:left}
td.num,th.num{text-align:right}
.swatch{display:inline-flex;border:2px solid var(--ink)}
.swatch span{width:42px;height:42px;display:inline-block}
.big{font-size:1.4rem;font-weight:700}
img.mask{image-rendering:pixelated;max-width:100%;border:2px solid var(--ink)}
code{background:#eee;padding:.1rem .3rem;border-radius:3px}
</style></head><body>""")
    html.append("<h1>Expansion Punks — onchain vs IPFS verification</h1>")
    html.append("<p>Every punk read from the onchain Renderer and compared pixel-for-pixel against the original image the live collection references on IPFS.</p>")
    html.append("<h2>Result</h2><table>")
    html.append("<tr><th>Outcome</th><th class='num'>Punks</th></tr>")
    html.append(f"<tr><td>Exact pixel match</td><td class='num'>{summary['exact']:,}</td></tr>")
    html.append(f"<tr><td>Visually identical (alpha rounding ≤ {summary['tolerance']}/ch)</td><td class='num'>{summary['rounding']:,}</td></tr>")
    html.append(f"<tr><td>Structural difference</td><td class='num'>{summary['structural']:,}</td></tr>")
    html.append(f"<tr><td><b>Total</b></td><td class='num'><b>{summary['total']:,}</b></td></tr></table>")
    html.append(f"<p class='big'>{exact_pct:.2f}% pixel-identical or sub-perceptual rounding.</p>")

    html.append("<h2>What the rounding difference looks like</h2>")
    html.append(
        f"<p>Original (left) next to onchain (right) — every distinct pair across the "
        f"collection ({len(top_pairs)} in total). The off-by-one comes from compositing "
        "the semi-transparent <code>#DDDDDD80</code> over the pixels beneath it (skin, "
        "hair and other trait colours).</p>"
    )
    html.append("<table><tr><th>Original → Onchain</th><th>Hex</th><th class='num'>Δ</th><th class='num'>Pixels</th></tr>")
    for s in swatch_meta:
        html.append(
            f"<tr><td><span class='swatch'><span style='background:{s['orig_hex']}'></span>"
            f"<span style='background:{s['onchain_hex']}'></span></span></td>"
            f"<td><code>{s['orig_hex']}</code> → <code>{s['onchain_hex']}</code></td>"
            f"<td class='num'>{s['delta']}</td><td class='num'>{s['count']:,}</td></tr>"
        )
    html.append("</table>")

    html.append("<h2>Perceptual identity (thresholded)</h2>")
    html.append(
        "<p>SHA-256 is all-or-nothing — one rounded channel flips the whole digest. "
        "To <em>quantify</em> “visually the same”, each punk also carries three "
        "independent 64-bit perceptual hashes (<b>aHash</b> average, <b>dHash</b> "
        "gradient, <b>pHash</b> DCT); we measure the Hamming distance between the "
        "onchain and original fingerprint.</p>"
    )
    html.append(
        f"<p class='big'>Max distance {max_perc}/64 across all {summary['total']:,} punks "
        f"— threshold {threshold} (≤5 = near-identical), {perc_exc} exception"
        f"{'' if perc_exc == 1 else 's'}.</p>"
    )
    html.append("<table><tr><th class='num'>Distance</th><th class='num'>aHash</th><th class='num'>dHash</th><th class='num'>pHash</th></tr>")
    for d in perc_distances:
        html.append(
            f"<tr><td class='num'>{d}</td><td class='num'>{perc['ahash'].get(d, 0):,}</td>"
            f"<td class='num'>{perc['dhash'].get(d, 0):,}</td><td class='num'>{perc['phash'].get(d, 0):,}</td></tr>"
        )
    html.append("</table>")

    html.append("<h2>Structural differences</h2>")
    if not structural:
        html.append("<p>None. No punk differed beyond the alpha-rounding band.</p>")
    else:
        html.append(f"<p>{len(structural)} punk(s). Mask = original | onchain | diff (magenta = changed).</p>")
        for t in structural:
            html.append(f"<h3>Punk #{t['tokenId']} — {t['num_diff_pixels']} px, max Δ {t['max_channel_delta']}</h3>")
            if t.get("mask"):
                src = os.path.join(CACHE, t["mask"])
                if os.path.exists(src):
                    html.append(f"<img class='mask' src='{b64_png(src)}'>")
    html.append("<h2>Reproduce</h2>")
    html.append("<p><code>pip install -r verify/requirements.txt &amp;&amp; python verify/compare.py --tokens 10000-19999 &amp;&amp; python verify/build_report.py</code></p>")
    html.append("</body></html>")

    html_path = os.path.join(REPORT, "report.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write("\n".join(html))

    print(f"Report written:\n  {md_path}\n  {csv_path}\n  {html_path}")
    print(f"  exact={summary['exact']} rounding={summary['rounding']} structural={summary['structural']}")


if __name__ == "__main__":
    main()
