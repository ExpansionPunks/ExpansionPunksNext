"use client";

import { useSyncExternalStore } from "react";
import { useConnect } from "wagmi";
import { selectWalletOptions, type WalletOption } from "@/lib/wallet-options";

let providerAnnounced = false;

function subscribeToInjectedWallet(onStoreChange: () => void) {
  const handleProviderAnnouncement = () => {
    providerAnnounced = true;
    onStoreChange();
  };
  window.addEventListener("eip6963:announceProvider", handleProviderAnnouncement);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => {
    window.removeEventListener("eip6963:announceProvider", handleProviderAnnouncement);
  };
}

function hasInjectedWallet() {
  return providerAnnounced || "ethereum" in window;
}

function assumeWalletDuringServerRender() {
  return true;
}

export function useWalletOptions(): {
  options: WalletOption[];
  injectedWalletAvailable: boolean;
} {
  const { connectors } = useConnect();
  const injectedWalletAvailable = useSyncExternalStore(
    subscribeToInjectedWallet,
    hasInjectedWallet,
    assumeWalletDuringServerRender,
  );
  return { options: selectWalletOptions([...connectors]), injectedWalletAvailable };
}
