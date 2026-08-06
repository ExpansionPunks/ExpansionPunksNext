import { readFile } from "node:fs/promises";
import path from "node:path";
import { IPFS_GATEWAY, IPFS_IMAGE_CID } from "@/lib/verify-config";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await params;
  const id = Number(tokenId);

  if (!Number.isInteger(id) || id < 10000 || id > 19999) {
    return new Response("Unknown punk", { status: 404 });
  }

  try {
    const png = await readFile(
      path.resolve(
        /* turbopackIgnore: true */
        process.cwd(),
        "..",
        "..",
        "compositions",
        `punk${id}.png`,
      ),
    );

    return new Response(png, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/png",
      },
    });
  } catch {
    try {
      const upstream = await fetch(`${IPFS_GATEWAY}/${IPFS_IMAGE_CID}/punk${id}.png`, {
        next: { revalidate: false },
      });
      if (!upstream.ok) throw new Error("Canonical artwork unavailable");

      return new Response(await upstream.arrayBuffer(), {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": "image/png",
        },
      });
    } catch {
      return new Response("Artwork unavailable", { status: 502 });
    }
  }
}
