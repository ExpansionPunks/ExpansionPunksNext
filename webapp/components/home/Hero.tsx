import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FloatingPunks } from "@/components/home/FloatingPunks";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>
          ExpansionPunks,
          <br />
          fully onchain.
        </h1>
        <p>
          Same punk. Same identity. Same token ID. Follow the approved path
          from IPFS-dependent artwork to a permanent onchain home.
        </p>
        <div className="hero-actions">
          <ButtonLink variant="primary" href="/story">
            Start with the story
          </ButtonLink>
        </div>
      </div>
      <FloatingPunks />
      <div className="current-status">
        <div>
          <strong>XIP 24 + XIP 25 approved</strong>
          <span>
            The community approved the migration and final DAO execution.
          </span>
        </div>
        <div className="status-now">
          <i aria-hidden="true" />
          <strong>Now: verify 10,000 artworks</strong>
          <span>
            Migration opens after preflight, mainnet deployment, and published proof.
          </span>
        </div>
        <Link className="text-link" href="/xips#timeline">
          View execution path
        </Link>
      </div>
    </section>
  );
}
