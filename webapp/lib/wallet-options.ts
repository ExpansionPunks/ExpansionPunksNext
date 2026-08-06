export type WalletConnectorLike = { id: string; name: string; icon?: string };

export type WalletOption<C extends WalletConnectorLike = WalletConnectorLike> = {
  id: string;
  connector: C;
  name: string;
  icon?: string;
};

const GENERIC_INJECTED_ID = "injected";

/** Normalize a connector's display name for the picker. */
export function walletName(name: string): string {
  if (name.toLowerCase().includes("rabby")) return "Rabby Wallet";
  if (name === "Injected") return "Browser wallet";
  return name;
}

/**
 * Reduce wagmi's discovered connectors to a deduplicated, display-ready list.
 * Dedup by connector id (the EIP-6963 rdns for discovered wallets). Drop the
 * generic `injected` connector whenever a real EIP-6963 wallet is present; keep
 * it only as a lone fallback (legacy single window.ethereum, no announcement).
 */
export function selectWalletOptions<C extends WalletConnectorLike>(
  connectors: readonly C[],
): WalletOption<C>[] {
  const byId = new Map<string, C>();
  for (const connector of connectors) {
    if (!byId.has(connector.id)) byId.set(connector.id, connector);
  }
  const unique = [...byId.values()];
  const hasRealWallet = unique.some((c) => c.id !== GENERIC_INJECTED_ID);
  const visible = hasRealWallet
    ? unique.filter((c) => c.id !== GENERIC_INJECTED_ID)
    : unique;
  return visible.map((connector) => ({
    id: connector.id,
    connector,
    name: walletName(connector.name),
    icon: connector.icon,
  }));
}
