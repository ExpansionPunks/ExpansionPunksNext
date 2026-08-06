"""Generate and exhaustively validate ExpansionPunks V2 deployment data.

The V2 payloads derive only from validated V1 deployment fixtures. Every trait,
descriptor record, and type is compared before output is written. The manifest
commits to payload hashes and SSTORE2 runtime codehashes.
"""

from __future__ import annotations

import hashlib
import json
import struct
import zlib
from collections import defaultdict
from pathlib import Path

from Crypto.Hash import keccak


ROOT = Path(__file__).resolve().parents[1]
DEPLOY = ROOT / "deployment-data"
OUT = DEPLOY / "v2"

TOKEN_COUNT = 10_000
LIVE_RECORD_BYTES = 10
PACKED_RECORD_BYTES = 5
SSTORE2_PAYLOAD = 24_575  # maximum data bytes after Solady's STOP prefix

CATEGORY_ORDER = [
    "Base",
    "Blemish",
    "Ear",
    "Eyes",
    "Facial Hair",
    "Hair",
    "Mouth",
    "Mouth (Implicit)",
    "Mouth Prop",
    "Neck Accessory",
    "Nose",
]

# Packed fields. Optional category values are zero for absent and local code + 1
# when present. Mouth and implicit-mouth share one three-bit field.
FIELDS = [
    ("human_type", 2),
    ("base", 4),
    ("blemish", 2),
    ("ear", 1),
    ("eyes", 5),
    ("facial_hair", 4),
    ("hair", 6),
    ("mouth", 3),
    ("mouth_prop", 3),
    ("neck_accessory", 2),
    ("nose", 1),
]


def load_json(name: str):
    return json.loads((DEPLOY / name).read_text(encoding="utf-8"))


def parse_prefix(filename: str) -> tuple[str, str]:
    stem = filename.removesuffix(".png")
    prefix, base_name = stem.split("-", 1)
    return prefix, base_name


def decode_type(type_data: bytes, token_offset: int) -> int:
    packed = type_data[token_offset // 2]
    return packed >> 4 if token_offset % 2 == 0 else packed & 0x0F


def unpack_live_records(data: bytes) -> list[list[int]]:
    assert len(data) == TOKEN_COUNT * LIVE_RECORD_BYTES
    records = []
    for token in range(TOKEN_COUNT):
        record = data[token * 10 : token * 10 + 10]
        count = record[0]
        assert 1 <= count <= 9
        assert all(value == 0xFF for value in record[1 + count :])
        records.append(list(record[1 : 1 + count]))
    return records


def build_trait_maps():
    trait_order = load_json("trait-order.json")["traits"]
    batch_meta = load_json("batch-metadata.json")["batches"]

    global_by_name = {entry["filename"]: entry["index"] for entry in trait_order}
    name_by_global = {entry["index"]: entry["filename"] for entry in trait_order}
    category_by_name = {}
    local_by_name = {}
    for batch in batch_meta:
        for local, filename in enumerate(batch["traits"]):
            category_by_name[filename] = batch["category"]
            local_by_name[filename] = local

    assert len(global_by_name) == 199
    assert set(global_by_name) == set(category_by_name)
    return trait_order, batch_meta, global_by_name, name_by_global, category_by_name, local_by_name


def build_direct_art(batch_meta, global_by_name):
    rle_by_global: dict[int, bytes] = {}
    for batch in batch_meta:
        compressed = (DEPLOY / f"batch_{batch['category'].lower().replace(' (implicit)', '_implicit').replace(' ', '_')}.deflate")
        # Production filenames have two irregular category spellings.
        if batch["category"] == "Facial Hair":
            compressed = DEPLOY / "batch_facial_hair.deflate"
        elif batch["category"] == "Mouth Prop":
            compressed = DEPLOY / "batch_mouth_prop.deflate"
        elif batch["category"] == "Neck Accessory":
            compressed = DEPLOY / "batch_neck_accessory.deflate"

        raw = zlib.decompress(compressed.read_bytes(), wbits=-15)
        count = struct.unpack_from("<H", raw, 0)[0]
        assert count == batch["trait_count"] == len(batch["traits"])
        lengths = struct.unpack_from(f"<{count}H", raw, 2)
        cursor = 2 + count * 2
        for filename, length in zip(batch["traits"], lengths):
            rle = raw[cursor : cursor + length]
            assert len(rle) == length and length % 2 == 0
            assert sum(rle[1::2]) == 576
            rle_by_global[global_by_name[filename]] = rle
            cursor += length
        assert cursor == len(raw)

    assert len(rle_by_global) == 199
    palette = (DEPLOY / "palette.bin").read_bytes()
    metadata = (DEPLOY / "trait_metadata.bin").read_bytes()

    # Header: magic(4), metadata offset(2), palette(504), 200 absolute uint16
    # offsets (one start per trait plus one terminal offset), RLE body, metadata.
    header_size = 4 + 2 + len(palette) + 200 * 2
    body = bytearray()
    offsets = []
    for global_index in range(199):
        offsets.append(header_size + len(body))
        body.extend(rle_by_global[global_index])
    offsets.append(header_size + len(body))
    metadata_offset = header_size + len(body)

    blob = bytearray(b"XPA1")
    blob.extend(struct.pack("<H", metadata_offset))
    blob.extend(palette)
    blob.extend(struct.pack("<200H", *offsets))
    blob.extend(body)
    blob.extend(metadata)

    assert len(blob) < SSTORE2_PAYLOAD
    assert blob[6:510] == palette
    for global_index in range(199):
        start, end = struct.unpack_from("<HH", blob, 510 + global_index * 2)
        assert blob[start:end] == rle_by_global[global_index]
    assert blob[metadata_offset:] == metadata
    return bytes(blob), offsets, metadata_offset


def build_vocab(batch_meta):
    """Collapse uf/um and f/m/nbf/nbm visual variants to base trait names."""
    vocabs: dict[str, list[str]] = {}
    for batch in batch_meta:
        names = []
        for filename in batch["traits"]:
            _, base_name = parse_prefix(filename)
            if base_name not in names:
                names.append(base_name)
        vocabs[batch["category"]] = names

    assert len(vocabs["Base"]) == 7
    assert len(vocabs["Blemish"]) == 3
    assert len(vocabs["Ear"]) == 1
    assert len(vocabs["Eyes"]) == 16
    assert len(vocabs["Facial Hair"]) == 12
    assert len(vocabs["Hair"]) == 41
    assert len(vocabs["Mouth"]) == 6
    assert len(vocabs["Mouth (Implicit)"]) == 1
    assert len(vocabs["Mouth Prop"]) == 4
    assert len(vocabs["Neck Accessory"]) == 3
    assert len(vocabs["Nose"]) == 1
    return vocabs


def presentation(type_id: int, base_prefix: str) -> str:
    if type_id == 2:
        return "nbf" if base_prefix == "uf" else "nbm"
    return "f" if base_prefix == "uf" else "m"


def visual_filename(category: str, base_name: str, present: str, names: set[str]) -> str:
    if category == "Hair" and f"{present}-{base_name}.png" in names:
        return f"{present}-{base_name}.png"
    side = "uf" if present in ("f", "nbf") else "um"
    candidate = f"{side}-{base_name}.png"
    assert candidate in names, (category, base_name, present, candidate)
    return candidate


def pack_fields(values: dict[str, int]) -> bytes:
    packed = 0
    shift = 0
    for name, width in FIELDS:
        value = values[name]
        assert 0 <= value < (1 << width), (name, value, width)
        packed |= value << shift
        shift += width
    assert shift == 33
    return packed.to_bytes(PACKED_RECORD_BYTES, "little")


def unpack_fields(record: bytes) -> dict[str, int]:
    packed = int.from_bytes(record, "little")
    values = {}
    shift = 0
    for name, width in FIELDS:
        values[name] = (packed >> shift) & ((1 << width) - 1)
        shift += width
    assert packed >> shift == 0
    return values


def sha256_hex(data: bytes) -> str:
    return "0x" + hashlib.sha256(data).hexdigest()


def sstore2_codehash(data: bytes) -> str:
    digest = keccak.new(digest_bits=256)
    digest.update(b"\x00" + data)
    return "0x" + digest.hexdigest()


def build_packed_descriptor(
    live_records,
    type_data,
    name_by_global,
    category_by_name,
    global_by_name,
    vocabs,
):
    all_names = set(global_by_name)
    packed = bytearray()
    category_sequences = defaultdict(int)

    category_to_field = {
        "Blemish": "blemish",
        "Ear": "ear",
        "Eyes": "eyes",
        "Facial Hair": "facial_hair",
        "Hair": "hair",
        "Mouth Prop": "mouth_prop",
        "Neck Accessory": "neck_accessory",
        "Nose": "nose",
    }

    for token_offset, indices in enumerate(live_records):
        filenames = [name_by_global[index] for index in indices]
        categories = [category_by_name[name] for name in filenames]
        category_sequences[tuple(categories)] += 1
        assert categories[0] == "Base"
        assert len(categories) == len(set(categories)), (token_offset + 10000, categories)

        type_id = decode_type(type_data, token_offset)
        base_prefix, base_name = parse_prefix(filenames[0])
        assert base_prefix in ("uf", "um")

        values = {name: 0 for name, _ in FIELDS}
        values["human_type"] = type_id if type_id <= 2 else 0
        values["base"] = vocabs["Base"].index(base_name) + (0 if base_prefix == "uf" else 7)

        for filename, category in zip(filenames[1:], categories[1:]):
            _, item_base = parse_prefix(filename)
            if category == "Mouth (Implicit)":
                values["mouth"] = 1
            elif category == "Mouth":
                values["mouth"] = vocabs["Mouth"].index(item_base) + 2
            else:
                field = category_to_field[category]
                values[field] = vocabs[category].index(item_base) + 1

        record = pack_fields(values)
        decoded = unpack_fields(record)
        present = presentation(type_id, base_prefix)

        reconstructed_by_category = {"Base": global_by_name[filenames[0]]}
        for category, field in category_to_field.items():
            code = decoded[field]
            if code:
                base = vocabs[category][code - 1]
                reconstructed_by_category[category] = global_by_name[
                    visual_filename(category, base, present, all_names)
                ]
        mouth_code = decoded["mouth"]
        if mouth_code == 1:
            reconstructed_by_category["Mouth (Implicit)"] = global_by_name["uf-nomouth.png"]
        elif mouth_code >= 2:
            base = vocabs["Mouth"][mouth_code - 2]
            reconstructed_by_category["Mouth"] = global_by_name[
                visual_filename("Mouth", base, present, all_names)
            ]

        reconstructed = [reconstructed_by_category[category] for category in categories]
        assert reconstructed == indices, (token_offset + 10000, filenames, reconstructed)

        decoded_type = type_id
        if base_name == "zombie":
            decoded_type = 3
        elif base_name == "ape":
            decoded_type = 4
        elif base_name == "alien":
            decoded_type = 5
        else:
            decoded_type = decoded["human_type"]
        assert decoded_type == type_id
        packed.extend(record)

    assert len(packed) == TOKEN_COUNT * PACKED_RECORD_BYTES
    chunks = [bytes(packed[i : i + SSTORE2_PAYLOAD]) for i in range(0, len(packed), SSTORE2_PAYLOAD)]
    assert [len(chunk) for chunk in chunks] == [24575, 24575, 850]
    return bytes(packed), chunks, category_sequences


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    trait_order, batch_meta, global_by_name, name_by_global, category_by_name, _ = build_trait_maps()
    live_descriptor = (DEPLOY / "descriptor.bin").read_bytes()
    type_data = (DEPLOY / "type_lookup.bin").read_bytes()
    live_records = unpack_live_records(live_descriptor)

    direct_art, offsets, metadata_offset = build_direct_art(batch_meta, global_by_name)
    vocabs = build_vocab(batch_meta)
    packed, chunks, category_sequences = build_packed_descriptor(
        live_records,
        type_data,
        name_by_global,
        category_by_name,
        global_by_name,
        vocabs,
    )

    (OUT / "direct_art.bin").write_bytes(direct_art)
    (OUT / "packed_descriptor.bin").write_bytes(packed)
    for index, chunk in enumerate(chunks):
        (OUT / f"packed_descriptor_chunk_{index}.bin").write_bytes(chunk)

    manifest = {
        "version": 2,
        "source": "validated V1 deployment-data fixtures",
        "validation": {
            "directArtTraitsRoundTripped": 199,
            "descriptorRecordsRoundTripped": 10000,
            "typeRecordsRoundTripped": 10000,
            "uniqueCategorySequences": len(category_sequences),
        },
        "live": {
            "compressedArtAndPaletteBytes": sum(path.stat().st_size for path in DEPLOY.glob("batch_*.deflate"))
            + (DEPLOY / "palette.bin").stat().st_size,
            "traitMetadataBytes": (DEPLOY / "trait_metadata.bin").stat().st_size,
            "descriptorBytes": len(live_descriptor),
            "typeBytes": len(type_data),
        },
        "candidate": {
            "directArtIncludingPaletteOffsetsMetadataBytes": len(direct_art),
            "metadataOffset": metadata_offset,
            "rleBodyBytes": offsets[-1] - offsets[0],
            "packedDescriptorBytes": len(packed),
            "packedDescriptorChunkBytes": [len(chunk) for chunk in chunks],
            "packedBitsUsed": sum(width for _, width in FIELDS),
            "packedBitsSpare": PACKED_RECORD_BYTES * 8 - sum(width for _, width in FIELDS),
            "sha256": {
                "directArt": sha256_hex(direct_art),
                "packedDescriptor": sha256_hex(packed),
                "descriptorChunks": [sha256_hex(chunk) for chunk in chunks],
            },
            "sstore2RuntimeCodehash": {
                "directArt": sstore2_codehash(direct_art),
                "descriptorChunks": [sstore2_codehash(chunk) for chunk in chunks],
            },
        },
        "fields": [{"name": name, "bits": width} for name, width in FIELDS],
        "vocabs": vocabs,
        "categorySequences": [
            {"categories": list(sequence), "tokens": count}
            for sequence, count in sorted(category_sequences.items(), key=lambda item: (-item[1], item[0]))
        ],
        "traits": trait_order,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(json.dumps(manifest["validation"] | manifest["candidate"], indent=2))


if __name__ == "__main__":
    main()

