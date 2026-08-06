"use client";

import { useEffect, useRef } from "react";
import type { WalletOption } from "@/lib/wallet-options";

type WalletPickerPopoverProps = {
  options: WalletOption[];
  pendingId: string | null;
  errorId: string | null;
  errorMessage: string | null;
  onSelect: (option: WalletOption) => void;
  onClose: () => void;
};

export function WalletPickerPopover({
  options,
  pendingId,
  errorId,
  errorMessage,
  onSelect,
  onClose,
}: WalletPickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="wallet-picker" ref={ref} role="menu" aria-label="Choose a wallet">
      {options.map((option) => (
        <button
          key={option.id}
          className="wallet-picker-option"
          type="button"
          role="menuitem"
          disabled={pendingId !== null}
          onClick={() => onSelect(option)}
        >
          {option.icon ? (
            // Wallet icons are EIP-6963 data URIs; next/image adds no value here.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="wallet-picker-icon" src={option.icon} alt="" width={20} height={20} />
          ) : (
            <span className="wallet-picker-icon" aria-hidden />
          )}
          <span className="wallet-picker-name">{option.name}</span>
          {pendingId === option.id ? (
            <span className="wallet-picker-status">Connecting…</span>
          ) : errorId === option.id ? (
            <span className="wallet-picker-status error">{errorMessage}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
