import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// RPC endpoints come from env so no key lives in source. Each falls back to
// the chain's public default when unset (fine for the content stage).
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
const mainnetRpcUrl = process.env.NEXT_PUBLIC_MAINNET_RPC_URL;

export const walletConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  ssr: true,
  transports: {
    [mainnet.id]: mainnetRpcUrl ? http(mainnetRpcUrl) : http(),
    [sepolia.id]: sepoliaRpcUrl ? http(sepoliaRpcUrl) : http(),
  },
});

export function formatWalletAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
