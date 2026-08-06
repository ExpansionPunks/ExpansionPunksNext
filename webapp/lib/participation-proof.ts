export type Leaf = { address: string; amountWei: string; proof: `0x${string}`[] };
export type MerkleFile = { root: `0x${string}`; poolWei: string; leaves: Leaf[] };

export function lookupParticipation(
  merkle: { leaves: { address: string; amountWei: string; proof: string[] }[] },
  address: string,
): { amountWei: string; proof: `0x${string}`[] } | null {
  const want = address.toLowerCase();
  const leaf = merkle.leaves.find((l) => l.address.toLowerCase() === want);
  return leaf ? { amountWei: leaf.amountWei, proof: leaf.proof as `0x${string}`[] } : null;
}

export async function loadParticipationMerkle(url: string): Promise<MerkleFile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to load participation tree: ${res.status}`);
  const data = (await res.json()) as MerkleFile;
  if (!/^0x[0-9a-fA-F]{64}$/.test(data.root) || !/^\d+$/.test(data.poolWei)) {
    throw new Error("invalid participation tree metadata");
  }
  return data;
}

export function participationTreeMatches(
  merkle: MerkleFile,
  expectedRoot: string,
  expectedPoolWei: bigint,
): boolean {
  return merkle.root.toLowerCase() === expectedRoot.toLowerCase()
    && BigInt(merkle.poolWei) === expectedPoolWei;
}
