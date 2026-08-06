"use client";

import { useSearchParams } from "next/navigation";
import { isAddress, type Address } from "viem";
import { useAccount } from "wagmi";

export function useViewerWallet() {
  const account = useAccount();
  const searchParams = useSearchParams();
  const requestedAddress = searchParams.get("wallet");
  const devAddress =
    process.env.NODE_ENV === "development" &&
    requestedAddress &&
    isAddress(requestedAddress)
      ? (requestedAddress as Address)
      : undefined;
  const address = account.address ?? devAddress;

  return {
    ...account,
    address,
    hasViewer: Boolean(address),
    isReadOnlyViewer: Boolean(devAddress && !account.isConnected),
  };
}