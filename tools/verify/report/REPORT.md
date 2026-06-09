# Expansion Punks — onchain vs IPFS verification report

Every punk's image was read directly from the onchain Renderer (`renderSVGWithBackground`) and compared, pixel-for-pixel, against the original image the live collection references on IPFS. This report is reproducible with the kit in [`verify/`](./../README.md).

## Result

| Outcome | Punks |
|---|---:|
| Exact pixel match | 6,085 |
| Visually identical (alpha rounding ≤ 8/channel) | 3,915 |
| Structural difference | 0 |
| **Total** | **10,000** |

**100.00%** of punks are pixel-identical or differ only by sub-perceptual alpha rounding. No structural differences were found.

## What the rounding difference looks like

Where punks aren't byte-identical, the cause is off-by-one rounding when the semi-transparent colour `#DDDDDD80` is composited over the pixels beneath it (skin, hair and other trait colours) — the original renderer and the onchain renderer round the blend a hair differently. Every distinct pair across the collection is shown below (107 in total); each is the **original (left)** next to the **onchain (right)** colour. Judge the closeness yourself.

Per-channel max delta across all rounding punks:

| Δ (max channel) | Punks |
|---:|---:|
| 1 | 3,910 |
| 4 | 5 |

| Original → Onchain | Hex (orig → onchain) | Δ | Pixels |
|---|---|---:|---:|
| ![pair](swatches/swatch_00.png) | `#eece6f` → `#edce6e` | 1 | 5,789 |
| ![pair](swatches/swatch_01.png) | `#dcbc5d` → `#dbbb5c` | 1 | 3,464 |
| ![pair](swatches/swatch_02.png) | `#997c59` → `#987b59` | 1 | 3,081 |
| ![pair](swatches/swatch_03.png) | `#4f2c14` → `#4e2b14` | 1 | 2,561 |
| ![pair](swatches/swatch_04.png) | `#796144` → `#796143` | 1 | 2,384 |
| ![pair](swatches/swatch_05.png) | `#bbb3a6` → `#bab2a6` | 1 | 1,563 |
| ![pair](swatches/swatch_06.png) | `#d4c8b8` → `#d3c8b7` | 1 | 1,500 |
| ![pair](swatches/swatch_07.png) | `#311b0d` → `#301b0c` | 1 | 1,488 |
| ![pair](swatches/swatch_08.png) | `#4b3c2a` → `#4b3b29` | 1 | 1,358 |
| ![pair](swatches/swatch_09.png) | `#281b09` → `#271a09` | 1 | 791 |
| ![pair](swatches/swatch_10.png) | `#a49681` → `#a49680` | 1 | 632 |
| ![pair](swatches/swatch_11.png) | `#b6a389` → `#b6a288` | 1 | 608 |
| ![pair](swatches/swatch_12.png) | `#3c5659` → `#3c5658` | 1 | 544 |
| ![pair](swatches/swatch_13.png) | `#507c33` → `#4f7c33` | 1 | 528 |
| ![pair](swatches/swatch_14.png) | `#655e5e` → `#645d5d` | 1 | 520 |
| ![pair](swatches/swatch_15.png) | `#5c8539` → `#5c8438` | 1 | 512 |
| ![pair](swatches/swatch_16.png) | `#af2c7b` → `#af2c7a` | 1 | 512 |
| ![pair](swatches/swatch_17.png) | `#5c736b` → `#5c726a` | 1 | 500 |
| ![pair](swatches/swatch_18.png) | `#a32375` → `#a22375` | 1 | 500 |
| ![pair](swatches/swatch_19.png) | `#dcdfea` → `#dcdee9` | 1 | 494 |
| ![pair](swatches/swatch_20.png) | `#506a65` → `#506a64` | 1 | 404 |
| ![pair](swatches/swatch_21.png) | `#584733` → `#574633` | 1 | 318 |
| ![pair](swatches/swatch_22.png) | `#b7ab98` → `#b6aa97` | 1 | 316 |
| ![pair](swatches/swatch_23.png) | `#cfbda6` → `#cebda5` | 1 | 304 |
| ![pair](swatches/swatch_24.png) | `#463827` → `#453726` | 1 | 276 |
| ![pair](swatches/swatch_25.png) | `#2d190c` → `#2d190b` | 1 | 274 |
| ![pair](swatches/swatch_26.png) | `#485d5d` → `#485c5c` | 1 | 272 |
| ![pair](swatches/swatch_27.png) | `#9b166d` → `#9a166c` | 1 | 268 |
| ![pair](swatches/swatch_28.png) | `#5d8b43` → `#5c8a43` | 1 | 264 |
| ![pair](swatches/swatch_29.png) | `#6e984d` → `#6d974d` | 1 | 256 |
| ![pair](swatches/swatch_30.png) | `#998475` → `#998375` | 1 | 256 |
| ![pair](swatches/swatch_31.png) | `#c13f8f` → `#c03e8f` | 1 | 256 |
| ![pair](swatches/swatch_32.png) | `#6e867f` → `#6e857f` | 1 | 250 |
| ![pair](swatches/swatch_33.png) | `#b03285` → `#af3185` | 1 | 250 |
| ![pair](swatches/swatch_34.png) | `#486f2b` → `#476e2a` | 1 | 238 |
| ![pair](swatches/swatch_35.png) | `#52321a` → `#51311a` | 1 | 235 |
| ![pair](swatches/swatch_36.png) | `#9b6f4d` → `#9a6e4c` | 1 | 230 |
| ![pair](swatches/swatch_37.png) | `#af38a1` → `#ae38a1` | 1 | 204 |
| ![pair](swatches/swatch_38.png) | `#5d7975` → `#5d7875` | 1 | 202 |
| ![pair](swatches/swatch_39.png) | `#b6b4bf` → `#b5b4bf` | 1 | 200 |
| ![pair](swatches/swatch_40.png) | `#ad7e59` → `#ac7e59` | 1 | 198 |
| ![pair](swatches/swatch_41.png) | `#aa7b54` → `#a97b53` | 1 | 193 |
| ![pair](swatches/swatch_42.png) | `#763b1a` → `#763a1a` | 1 | 165 |
| ![pair](swatches/swatch_43.png) | `#552f16` → `#542f15` | 1 | 160 |
| ![pair](swatches/swatch_44.png) | `#825032` → `#825031` | 1 | 155 |
| ![pair](swatches/swatch_45.png) | `#6f6f6f` → `#6e6e6e` | 1 | 146 |
| ![pair](swatches/swatch_46.png) | `#d09c6e` → `#d09b6e` | 1 | 136 |
| ![pair](swatches/swatch_47.png) | `#5c915f` → `#5b915f` | 1 | 124 |
| ![pair](swatches/swatch_48.png) | `#826849` → `#826848` | 1 | 124 |
| ![pair](swatches/swatch_49.png) | `#da8e66` → `#da8d66` | 1 | 121 |
| ![pair](swatches/swatch_50.png) | `#3c2413` → `#3b2312` | 1 | 117 |
| ![pair](swatches/swatch_51.png) | `#eeeab6` → `#ede9b5` | 1 | 115 |
| ![pair](swatches/swatch_52.png) | `#b66f4e` → `#b66f4d` | 1 | 110 |
| ![pair](swatches/swatch_53.png) | `#4f4538` → `#4e4438` | 1 | 107 |
| ![pair](swatches/swatch_54.png) | `#cac9d4` → `#c9c8d3` | 1 | 100 |
| ![pair](swatches/swatch_55.png) | `#645849` → `#635748` | 1 | 93 |
| ![pair](swatches/swatch_56.png) | `#5e5757` → `#5d5656` | 1 | 84 |
| ![pair](swatches/swatch_57.png) | `#a48560` → `#a4845f` | 1 | 82 |
| ![pair](swatches/swatch_58.png) | `#b38e7d` → `#b28e7c` | 1 | 78 |
| ![pair](swatches/swatch_59.png) | `#36462d` → `#35452d` | 1 | 55 |
| ![pair](swatches/swatch_60.png) | `#afa3a3` → `#afa2a2` | 1 | 49 |
| ![pair](swatches/swatch_61.png) | `#dcd8a4` → `#dbd7a3` | 1 | 48 |
| ![pair](swatches/swatch_62.png) | `#eeeeee` → `#ededed` | 1 | 47 |
| ![pair](swatches/swatch_63.png) | `#83c790` → `#82c790` | 1 | 42 |
| ![pair](swatches/swatch_64.png) | `#9fc0ab` → `#9fbfaa` | 1 | 39 |
| ![pair](swatches/swatch_65.png) | `#8ea59f` → `#8da49e` | 1 | 30 |
| ![pair](swatches/swatch_66.png) | `#5d5d5d` → `#5c5c5c` | 1 | 26 |
| ![pair](swatches/swatch_67.png) | `#e08282` → `#df8181` | 1 | 19 |
| ![pair](swatches/swatch_68.png) | `#922e8a` → `#922d8a` | 1 | 16 |
| ![pair](swatches/swatch_69.png) | `#32412a` → `#32402a` | 1 | 15 |
| ![pair](swatches/swatch_70.png) | `#e6aeae` → `#e6adad` | 1 | 15 |
| ![pair](swatches/swatch_71.png) | `#1a5927` → `#195827` | 1 | 12 |
| ![pair](swatches/swatch_72.png) | `#808f5b` → `#808f5a` | 1 | 12 |
| ![pair](swatches/swatch_73.png) | `#1a4759` → `#1a4658` | 1 | 12 |
| ![pair](swatches/swatch_74.png) | `#8d867e` → `#8d867d` | 1 | 11 |
| ![pair](swatches/swatch_75.png) | `#e8efc0` → `#e8eebf` | 1 | 11 |
| ![pair](swatches/swatch_76.png) | `#a4a3a0` → `#a3a3a0` | 1 | 10 |
| ![pair](swatches/swatch_77.png) | `#cad6e1` → `#c9d5e0` | 1 | 10 |
| ![pair](swatches/swatch_78.png) | `#c9f2fd` → `#c9f1fc` | 1 | 10 |
| ![pair](swatches/swatch_79.png) | `#772614` → `#762614` | 1 | 9 |
| ![pair](swatches/swatch_80.png) | `#6d0069` → `#6c0069` | 1 | 8 |
| ![pair](swatches/swatch_81.png) | `#dcdcdc` → `#dbdbdb` | 1 | 8 |
| ![pair](swatches/swatch_82.png) | `#52422f` → `#52422e` | 1 | 7 |
| ![pair](swatches/swatch_83.png) | `#868377` → `#868376` | 1 | 7 |
| ![pair](swatches/swatch_84.png) | `#877850` → `#87784f` | 1 | 7 |
| ![pair](swatches/swatch_85.png) | `#42503a` → `#414f39` | 1 | 6 |
| ![pair](swatches/swatch_86.png) | `#dacdbb` → `#d9ccbb` | 1 | 6 |
| ![pair](swatches/swatch_87.png) | `#a66e2c` → `#a26b2a` | 4 | 5 |
| ![pair](swatches/swatch_88.png) | `#b71b97` → `#b61a96` | 1 | 5 |
| ![pair](swatches/swatch_89.png) | `#8f8254` → `#8e8154` | 1 | 5 |
| ![pair](swatches/swatch_90.png) | `#43513b` → `#42513a` | 1 | 4 |
| ![pair](swatches/swatch_91.png) | `#251409` → `#241409` | 1 | 4 |
| ![pair](swatches/swatch_92.png) | `#5e794f` → `#5d794e` | 1 | 4 |
| ![pair](swatches/swatch_93.png) | `#a66e2c` → `#a66f2e` | 2 | 3 |
| ![pair](swatches/swatch_94.png) | `#392312` → `#382212` | 1 | 3 |
| ![pair](swatches/swatch_95.png) | `#986347` → `#986247` | 1 | 2 |
| ![pair](swatches/swatch_96.png) | `#b8b4ac` → `#b7b3ac` | 1 | 2 |
| ![pair](swatches/swatch_97.png) | `#382d1f` → `#382c1f` | 1 | 2 |
| ![pair](swatches/swatch_98.png) | `#5d2310` → `#5c2210` | 1 | 2 |
| ![pair](swatches/swatch_99.png) | `#9bcfda` → `#9acfd9` | 1 | 2 |
| ![pair](swatches/swatch_100.png) | `#b0e3ee` → `#b0e2ed` | 1 | 2 |
| ![pair](swatches/swatch_101.png) | `#725d43` → `#725c42` | 1 | 2 |
| ![pair](swatches/swatch_102.png) | `#473929` → `#463828` | 1 | 2 |
| ![pair](swatches/swatch_103.png) | `#a66e2c` → `#a8712f` | 3 | 1 |
| ![pair](swatches/swatch_104.png) | `#baaca2` → `#b9aba1` | 1 | 1 |
| ![pair](swatches/swatch_105.png) | `#a66e2c` → `#a36b2b` | 3 | 1 |
| ![pair](swatches/swatch_106.png) | `#7b6547` → `#7a6447` | 1 | 1 |

## Perceptual identity (thresholded)

SHA-256 is all-or-nothing: a single rounded channel flips the whole digest, so the rounding punks above carry different SHA-256s despite being visually the same. To put a *number* on "visually the same", each punk is also fingerprinted with three independent 64-bit perceptual hashes, and we measure the Hamming distance between the onchain and original fingerprint:

- **aHash** (average) — bit = pixel brighter than the image mean.
- **dHash** (gradient) — bit = pixel brighter than its right neighbour; immune to uniform brightness shifts.
- **pHash** (DCT) — low-frequency DCT coefficients thresholded at their median; the industry-standard perceptual hash.

For 64-bit perceptual hashes the accepted bands are **0 = identical, ≤5 = near-identical/duplicate, >10 = a different image**. Across all 10,000 punks the largest distance on *any* hash is **3/64**. At a threshold of **5**, every punk is perceptually identical to its original — **0 exceptions**.

Hamming-distance distribution (onchain vs original):

| Distance | aHash | dHash | pHash |
|---:|---:|---:|---:|
| 0 | 9,997 | 9,995 | 9,905 |
| 1 | 2 | 5 | 0 |
| 2 | 0 | 0 | 95 |
| 3 | 1 | 0 | 0 |

## Structural differences

None. No punk differed from its IPFS original beyond the alpha-rounding band.

## Methodology & reproduction

- **Onchain source:** Renderer `0x243C1Ca2d976Eef9fec23675F700814745299E68` via `https://sepolia.infura.io`, `renderSVGWithBackground(tokenId)`, rasterized to 24×24.
- **Original source:** `https://gold-thin-moose-287.mypinata.cloud/ipfs/QmaopicL9xSveFUTeuxj4iQDVBKgdg5k3b2iGkHaMzsK6b/punk{id}.png` (504×504), downscaled ×21 to 24×24 (nearest-neighbour).
- **Hashes:** SHA-256 over canonical 24×24 RGB bytes, plus three 64-bit perceptual hashes (aHash / dHash / pHash) with their onchain↔original Hamming distances. Threshold 5. Full per-token table in [`hashes.csv`](hashes.csv).
- **Sepolia ⇄ mainnet:** the deployed trait/descriptor bytes are identical across networks, so this verifies the same art mainnet serves. Re-run with `--renderer <mainnet>` after deployment.
- **Reproduce:** `pip install -r verify/requirements.txt && python verify/compare.py --tokens 10000-19999 && python verify/build_report.py`.
