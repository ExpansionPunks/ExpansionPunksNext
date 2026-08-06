"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { Connector } from "wagmi";
import type { WalletOption } from "@/lib/wallet-options";
import { useWalletOptions } from "@/components/wallet/useWalletOptions";
import { WalletPickerPopover } from "@/components/wallet/WalletPickerPopover";

type WalletButtonProps = {
  appearance?: "header" | "panel";
};

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connectAsync, isPending } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const { options, injectedWalletAvailable } = useWalletOptions();

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

  const connectTo = async (option: WalletOption) => {
    setPendingId(option.id);
    setErrorId(null);
    setErrorMessage(null);

    try {
      // option.connector is always a real wagmi Connector at runtime; WalletConnectorLike
      // is a minimal subset type used for dedup logic, so we cast to satisfy connectAsync.
      await connectAsync({ connector: option.connector as unknown as Connector });
      setPickerOpen(false);
    } catch (connectionError) {
      // Surface the underlying error for debugging; UI text is intentionally generic.
      console.error("[WalletButton] connect failed", connectionError);
      setErrorId(option.id);
      setErrorMessage(describeConnectionError(connectionError));
    } finally {
      setPendingId(null);
    }
  };

  const beginConnection = () => {
    setErrorId(null);
    setErrorMessage(null);

    if (options.length === 1) {
      void connectTo(options[0]);
    } else if (options.length > 1) {
      setPickerOpen(true);
    }
  };

  return (
    <div className={`wallet-control ${appearance}`}>
      <button
        className={appearance === "header" ? "wallet-action" : "button dark wallet-panel-button"}
        type="button"
        disabled={isPending || isDisconnecting || options.length === 0 || noInjectedWallet}
        onClick={beginConnection}
      >
        {noInjectedWallet ? "No wallet found" : isPending ? "Connecting..." : "Connect wallet"}
      </button>
      {pickerOpen && options.length > 1 ? (
        <WalletPickerPopover
          options={options}
          pendingId={pendingId}
          errorId={errorId}
          errorMessage={errorMessage}
          onSelect={connectTo}
          onClose={() => {
            // Clear any per-wallet error on dismiss so it doesn't reappear in the
            // global feedback slot under the collapsed button.
            setPickerOpen(false);
            setErrorId(null);
            setErrorMessage(null);
          }}
        />
      ) : null}
      {noInjectedWallet ? (
        <span className="wallet-feedback" role="status">
          Open in a browser with MetaMask or another wallet extension.
        </span>
      ) : errorMessage && !pickerOpen && !isConnected ? (
        <span className="wallet-feedback" role="status">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
