import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  activeMigrationContracts,
  legacyMigrationAbi,
  maxMigrationBatchSize,
  onchainMigrationAbi,
} from "@/lib/migration-contracts";
import { rewardsContract } from "@/lib/rewards-contracts";

type DevWalletRequest =
  | { action: "approve"; address: string }
  | { action: "migrate"; address: string; tokenIds: string[] }
  | { action: "claimParticipation"; address: string; amountWei: string; proof: Hex[] };

function unavailable() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    !activeMigrationContracts.testnet ||
    activeMigrationContracts.chainId !== sepolia.id
  ) {
    return unavailable();
  }

  const privateKey = process.env.E2E_PRIVATE_KEY as Hex | undefined;
  const rehearsalAddress = process.env.E2E_WALLET_ADDRESS;
  const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  const legacy = activeMigrationContracts.legacy;
  const current = activeMigrationContracts.current;
  if (!privateKey || !rehearsalAddress || !rpcUrl || !legacy || !current) return unavailable();

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return NextResponse.json({ error: "Cross-origin rehearsal requests are blocked." }, { status: 403 });
  }

  let body: DevWalletRequest;
  try {
    body = (await request.json()) as DevWalletRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const account = privateKeyToAccount(privateKey);
  if (
    !isAddress(rehearsalAddress) ||
    rehearsalAddress.toLowerCase() !== account.address.toLowerCase() ||
    !isAddress(body.address) ||
    body.address.toLowerCase() !== account.address.toLowerCase()
  ) {
    return NextResponse.json({ error: "Viewer does not match the rehearsal wallet." }, { status: 403 });
  }

  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({ account, chain: sepolia, transport });

  try {
    if (body.action === "claimParticipation") {
      const validProof = Array.isArray(body.proof)
        && body.proof.every((item) => /^0x[0-9a-fA-F]{64}$/.test(item));
      if (!rewardsContract.address || !/^\d+$/.test(body.amountWei) || !validProof) {
        return NextResponse.json({ error: "Invalid participation claim." }, { status: 400 });
      }
      const hash = await walletClient.writeContract({
        address: rewardsContract.address,
        abi: rewardsContract.abi,
        functionName: "claimParticipation",
        args: [BigInt(body.amountWei), body.proof, account.address],
      });
      return NextResponse.json({ hash });
    }

    if (body.action === "approve") {
      const hash = await walletClient.writeContract({
        address: legacy,
        abi: legacyMigrationAbi,
        functionName: "setApprovalForAll",
        args: [current, true],
      });
      return NextResponse.json({ hash });
    }

    const tokenIds = body.tokenIds.map(BigInt);
    if (
      tokenIds.length === 0 ||
      tokenIds.length > maxMigrationBatchSize ||
      new Set(tokenIds.map(String)).size !== tokenIds.length ||
      tokenIds.some((id) => id < BigInt(10000) || id > BigInt(19999))
    ) {
      return NextResponse.json({ error: "Invalid migration selection." }, { status: 400 });
    }

    const owners = await Promise.all(
      tokenIds.map((tokenId) =>
        publicClient.readContract({
          address: legacy,
          abi: legacyMigrationAbi,
          functionName: "ownerOf",
          args: [tokenId],
        }),
      ),
    );
    if (owners.some((owner: Address) => owner.toLowerCase() !== account.address.toLowerCase())) {
      return NextResponse.json({ error: "The rehearsal wallet does not own every selected token." }, { status: 400 });
    }

    const hash =
      tokenIds.length === 1
        ? await walletClient.writeContract({
            address: current,
            abi: onchainMigrationAbi,
            functionName: "migrate",
            args: [tokenIds[0]],
          })
        : await walletClient.writeContract({
            address: current,
            abi: onchainMigrationAbi,
            functionName: "migrateBatch",
            args: [tokenIds],
          });
    return NextResponse.json({ hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transaction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
