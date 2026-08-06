# Artwork data

Everything needed to regenerate the artwork payloads committed for the ExpansionPunks Next
mainnet candidate, and later check that the deployed contracts use exactly those bytes.

## What you can prove with this

Run one command and you regenerate the exact candidate byte payloads, along with the SSTORE2
runtime codehashes those payloads produce. Those codehashes are **hardcoded as constants inside
`RendererV2` and `PackedDescriptorV2`**. Matching them now proves the candidate source is bound to
this data; matching them against the later verified deployment proves the live contracts read the
same artwork and nothing else.

That is the whole claim, and it is checkable without trusting us.

## Reproduce

Requires Python 3.9 or newer.

```bash
cd reproduction
python -m pip install -r requirements.txt
python scripts/generate_v2_data.py
```

The generator writes to `reproduction/deployment-data/v2/` and prints a manifest. Compare it
against the frozen copy:

```bash
diff reproduction/deployment-data/v2/manifest.json commitments/v2-manifest.json
```

No output means the payloads match exactly.

The generator does more than convert files. It compares every trait, every descriptor record, and
every type against the validated source fixtures before it writes anything, and it fails rather
than emit output it cannot verify.

## What to compare against the contracts

The public contract source and live Etherscan links are release-gated and are not part of this
predeployment data package. Once published, open `RendererV2` and `PackedDescriptorV2` and check
these constants against the `sstore2RuntimeCodehash` section of the manifest:

| Constant | Contract |
| --- | --- |
| `ART_DATA_CODEHASH` | `RendererV2` |
| `DESCRIPTOR_CHUNK0_CODEHASH`, `CHUNK1`, `CHUNK2` | `RendererV2` |
| `CHUNK0_CODEHASH`, `CHUNK1_CODEHASH`, `CHUNK2_CODEHASH` | `PackedDescriptorV2` |

Both contracts verify these in their constructors and revert if a supplied pointer does not match,
so a substituted or altered data blob could not have been deployed in the first place. Checking
them yourself confirms the constants describe the data in this repository.

## Why there are DEFLATE files in here

`reproduction/deployment-data/` contains eleven `batch_*.deflate` files and several `.bin` files.
These are **offline inputs to the generator**, not onchain data.

They are the validated V1 fixtures. The V2 payloads are derived from them, and shipping them is
what makes the derivation checkable rather than something you have to take on faith.

**Nothing onchain reads them, and nothing onchain decompresses anything.** `RendererV2` reads
direct run-length-encoded data through SSTORE2 and composites it in one pass. An earlier design
did decompress DEFLATE at read time; it was replaced because the direct form is dramatically
cheaper, and that earlier contract was never deployed to mainnet. If you find a reference to
`Inflate.sol` or an `ArtStorage` contract anywhere, it belongs to that superseded design.

## Files

| Path | What it is |
| --- | --- |
| `commitments/v2-manifest.json` | Frozen manifest: payload SHA-256 hashes and SSTORE2 runtime codehashes |
| `reproduction/scripts/generate_v2_data.py` | The generator, unmodified |
| `reproduction/requirements.txt` | Pinned Python dependency |
| `reproduction/deployment-data/trait-order.json` | **Source of truth** for onchain trait indices |
| `reproduction/deployment-data/trait-names.json` | Display names for each trait |
| `reproduction/deployment-data/batch-metadata.json` | Which traits belong to which category batch |
| `reproduction/deployment-data/batch_*.deflate` | Compressed trait pixel data, 11 category batches |
| `reproduction/deployment-data/palette.bin` | Colour palette |
| `reproduction/deployment-data/trait_metadata.bin` | Trait name and category headers |
| `reproduction/deployment-data/descriptor.bin` | V1 token-to-trait records |
| `reproduction/deployment-data/type_lookup.bin` | Per-token type data |

## Notes on the collection

Token IDs run **10000 to 19999**, not from zero. There are 200 trait layer files but only 199 are
used: `um-nomouth.png` is unreferenced, and `uf-nomouth.png` serves both presentations.

## What this does not prove

This package proves the V2 payloads derive correctly from the published V1 fixtures. It does not
independently re-derive those fixtures from the original PNG layers.

This package also does not prove that a mainnet deployment has occurred. The independent report
checking all 10,000 rendered images against the original IPFS artwork, plus the final deployment
record, will be published under `reports/` when those release gates are complete.
