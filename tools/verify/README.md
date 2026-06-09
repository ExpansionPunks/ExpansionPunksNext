# Verify Expansion Punks: onchain vs IPFS

This is a small, self-contained kit for **independently checking that the art
stored onchain reproduces the original Expansion Punks collection.** It does
not trust anything in this repository as ground truth. For every punk it:

1. Reads the image straight from the deployed **Renderer contract**
   (`renderSVGWithBackground(tokenId)`) over a public RPC, and rasterizes the
   returned SVG to a 24×24 pixel grid.
2. Fetches the **original image the live collection references on IPFS** and
   downscales it 504→24 (an exact ×21 factor, so no resampling guesswork).
3. Compares the two pixel-for-pixel, records SHA-256 + average ("visual")
   hashes of both, and — whenever they differ — writes a side-by-side mask
   PNG so you can see exactly which pixels moved and by how much.

The only third-party dependency is [Pillow](https://python-pillow.org/).
Everything else is the Python standard library. The contract call is a plain
JSON-RPC `eth_call` with a hardcoded 4-byte function selector (derivation
shown in `compare.py`), so there is no web3 stack to audit around.

## Run it

```bash
pip install -r verify/requirements.txt

# verify one punk (prints both hashes + verdict, writes a mask if they differ)
python verify/compare.py --token 10036

# verify a range or an explicit list
python verify/compare.py --tokens 10000-10099
python verify/compare.py --tokens 11177,12101,18124

# verify the whole collection (resumable; cached to disk)
python verify/compare.py --tokens 10000-19999
```

Useful flags: `--rpc`, `--renderer`, `--gateway`, `--cid`, `--tolerance`,
`--concurrency`, `--out`. Defaults point at the current deployment; override
`--renderer`/`--rpc` to re-run against mainnet once it is live.

## What you get

```
verify/cache/
  onchain/punk{id}.svg     # raw contract response (cached)
  ipfs/punk{id}.png        # original IPFS image (cached)
  masks/punk{id}_mask.png  # original | onchain | diff  (only when not exact)
  results.json             # per-token dataset
```

Then build the human-readable report:

```bash
python verify/build_report.py
# -> verify/report/REPORT.md, hashes.csv, report.html, swatches/, masks/
```

## How a result is classified

| Class | Meaning |
|-------|---------|
| **exact** | Onchain and IPFS pixels are byte-identical. |
| **rounding** | The only differences are sub-perceptual (≤ tolerance per channel, default 8), from off-by-one alpha rounding where the semi-transparent `#DDDDDD80` colour is composited over the amber `#FFBF00` background. The report shows the two colours side by side so you can judge for yourself. |
| **structural** | A real difference larger than the rounding band. Each gets a mask. |

## Why Sepolia evidence counts for mainnet

The render is deterministic and reads only the deployed trait/descriptor
bytes, which are byte-for-byte identical across networks (see the artifact
SHA-256s in `.context/findings/verification-and-mainnet-readiness-2026-05-21.md`).
Verifying against Sepolia therefore verifies the exact same art that mainnet
serves. After mainnet deployment, re-run with `--renderer <mainnet address>`
to refresh the report against the live mainnet contract.
