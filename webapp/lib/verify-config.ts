import { createPublicClient, http, type Address } from "viem";
import { mainnet, sepolia } from "viem/chains";

// Verification is intentionally independent of NEXT_PUBLIC_SITE_STAGE: anyone
// should be able to verify a punk straight from the deployed Renderer, even on
// the content-stage site. We read whichever network has a Renderer deployed —
// Sepolia today, Ethereum once NEXT_PUBLIC_MAINNET_RENDERER_ADDRESS is set.

const SEPOLIA_RENDERER: Address = "0xF8d64610215E40F79dee61d352aB1BcC8749E700";

// IPFS image the live collection references (project Pinata gateway). The
// browser reaches it through the same-origin proxy route /verify/ipfs/{id}
// so the comparison canvas is never cross-origin tainted.
export const IPFS_GATEWAY = "https://gold-thin-moose-287.mypinata.cloud/ipfs";
export const IPFS_IMAGE_CID = "QmaopicL9xSveFUTeuxj4iQDVBKgdg5k3b2iGkHaMzsK6b";

export const TOKEN_MIN = 10000;
export const TOKEN_MAX = 19999;

// Sub-perceptual alpha-rounding band (per channel). Matches verify/compare.py.
export const TOLERANCE = 8;

// Perceptual-hash agreement threshold (Hamming distance, out of 64). For 64-bit
// perceptual hashes: 0 = identical, <=5 = near-identical, >10 = different image.
// Matches PERCEPTUAL_THRESHOLD in verify/compare.py.
export const PERCEPTUAL_THRESHOLD = 5;

function normalizeAddress(value: string | undefined): Address | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : undefined;
}

const mainnetRenderer = normalizeAddress(process.env.NEXT_PUBLIC_MAINNET_RENDERER_ADDRESS);
const sepoliaRenderer =
  normalizeAddress(process.env.NEXT_PUBLIC_SEPOLIA_RENDERER) ?? SEPOLIA_RENDERER;

export const verifyTarget = mainnetRenderer
  ? { chain: mainnet, renderer: mainnetRenderer, label: "Ethereum mainnet" }
  : { chain: sepolia, renderer: sepoliaRenderer, label: "Sepolia testnet" };

export const rendererAbi = [
  {
    type: "function",
    name: "renderSVGWithBackground",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

export function getVerifyClient() {
  const rpcUrl =
    verifyTarget.chain.id === mainnet.id
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL
      : process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  return createPublicClient({
    chain: verifyTarget.chain,
    transport: rpcUrl ? http(rpcUrl) : http(),
  });
}

export function ipfsProxyPath(tokenId: number) {
  return `/verify/ipfs/${tokenId}`;
}

export function isValidTokenId(id: number) {
  return Number.isInteger(id) && id >= TOKEN_MIN && id <= TOKEN_MAX;
}
