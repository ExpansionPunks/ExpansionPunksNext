"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

type WalletButtonProps = {
  appearance?: "header" | "panel";
};

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

function walletName(name: string) {
  if (name.toLowerCase().includes("rabby")) return "Rabby Wallet";
  if (name === "Injected") return "Browser wallet";
  return name;
}

function describeConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("reject") || message.includes("denied")) {
    return "Connection cancelled in your wallet.";
  }

  if (message.includes("provider") || message.includes("not found")) {
    return "No usable browser wallet was found.";
  }

  return "Wallet connection could not be completed.";
}

export function WalletButton({ appearance = "header" }: WalletButtonProps) {
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const injectedWalletAvailable = useSyncExternalStore(
    subscribeToInjectedWallet,
    hasInjectedWallet,
    assumeWalletDuringServerRender,
  );
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const walletOptions = connectors.filter(
    (connector, index) =>
      connectors.findIndex((other) => walletName(other.name) === walletName(connector.name)) === index,
  );
  const providerConnector = walletOptions.find((connector) => connector.name !== "Injected");
  const defaultConnector = providerConnector ?? walletOptions[0];

  if (isConnected && address && appearance === "header") {
    return (
      <div className="wallet-connected">
        <Link className="wallet-app" href="/holder">
          App
        </Link>
        <button
          className="wallet-disconnect"
          type="button"
          disabled={isDisconnecting}
          onClick={() => disconnect()}
        >
          {isDisconnecting ? "Closing" : "Disconnect"}
        </button>
      </div>
    );
  }

  const noInjectedWallet = !injectedWalletAvailable && !isConnected;

  const connectWallet = async (connector: (typeof walletOptions)[number]) => {
    setRequestFeedback(`Complete the ${walletName(connector.name)} request in your wallet.`);

    try {
      await connectAsync({ connector });
      setRequestFeedback(null);
    } catch (connectionError) {
      setRequestFeedback(describeConnectionError(connectionError));
    }
  };

  const beginConnection = () => {
    setRequestFeedback(null);

    if (defaultConnector) {
      void connectWallet(defaultConnector);
    }
  };

  return (
    <div className={`wallet-control ${appearance}`}>
      <button
        className={appearance === "header" ? "wallet-action" : "button dark wallet-panel-button"}
        type="button"
        disabled={isPending || isDisconnecting || walletOptions.length === 0 || noInjectedWallet}
        onClick={beginConnection}
      >
        {noInjectedWallet ? "No wallet found" : isPending ? "Connecting..." : "Connect wallet"}
      </button>
      {noInjectedWallet ? (
        <span className="wallet-feedback" role="status">
          Open in a browser with MetaMask or another wallet extension.
        </span>
      ) : requestFeedback && !isConnected ? (
        <span className="wallet-feedback" role="status">
          {requestFeedback}
        </span>
      ) : null}
    </div>
  );
}
