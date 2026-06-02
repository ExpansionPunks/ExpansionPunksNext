import Link from "next/link";
import type { ReactNode } from "react";

type StageGateProps = {
  title: string;
  children: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
};

// Shown where wallet/migration features live before they are enabled for the
// current stage (see lib/stage.ts). Keeps the route present but honest.
export function StageGate({ title, children, ctaHref, ctaLabel }: StageGateProps) {
  return (
    <div className="stage-gate" role="status">
      <span className="stage-gate-tag">Coming soon</span>
      <strong>{title}</strong>
      <p>{children}</p>
      {ctaHref && ctaLabel ? (
        <Link className="text-link" href={ctaHref}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
