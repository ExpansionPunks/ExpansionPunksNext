import { verifyLinks, verifyResult } from "@/lib/site-data";

const stats = [
  { label: "Punks checked", value: verifyResult.total.toLocaleString() },
  { label: "Exact pixel match", value: verifyResult.exact.toLocaleString() },
  {
    label: "Visually identical",
    value: verifyResult.rounding.toLocaleString(),
    note: `alpha rounding ≤${verifyResult.tolerancePerChannel}/channel`,
  },
  { label: "Structural differences", value: verifyResult.structural.toLocaleString() },
];

export function VerifyReportSummary() {
  return (
    <section className="verify">
      <div className="verify-inner verify-report">
        <div className="verify-stats">
          {stats.map((s) => (
            <div className="verify-stat" key={s.label}>
              <span className="verify-stat-value">{s.value}</span>
              <span className="verify-stat-label">{s.label}</span>
              {s.note ? <span className="verify-stat-note">{s.note}</span> : null}
            </div>
          ))}
        </div>

        <p className="verify-headline">
          We checked every punk. {verifyResult.exact.toLocaleString()} match exactly,{" "}
          {verifyResult.rounding.toLocaleString()} differ only by sub-perceptual alpha
          rounding, and zero differ structurally. Across three perceptual hashes the
          largest gap on any punk is {verifyResult.maxPerceptualDist}/64, well inside the
          near-identical threshold of {verifyResult.perceptualThreshold}.
        </p>

        <p className="verify-caveat">
          We ran this against the {verifyResult.network} Renderer, because mainnet isn&apos;t
          deployed yet. The trait data is byte-identical across networks, so this is the same
          art mainnet will serve — we re-run the check against mainnet once the contracts are
          live.
        </p>

        <div className="verify-how">
          <h3>How it works</h3>
          <ol>
            <li>
              We read a punk&apos;s image straight from the onchain Renderer contract and
              rasterize it to a 24×24 grid.
            </li>
            <li>
              We fetch the original image the collection has always referenced on IPFS and
              downscale it 504→24 — an exact ×21 factor, so there&apos;s no resampling
              guesswork.
            </li>
            <li>
              We diff the two pixel-for-pixel, then fingerprint both with three perceptual
              hashes (average, gradient, DCT) and measure the distance between them.
            </li>
          </ol>
        </div>

        <div className="verify-sources">
          <p>
            Everything here is reproducible. The report, the raw per-punk data, and the script
            that produced them live on GitHub.
          </p>
          <div className="verify-sources-actions">
            <a className="button secondary" href={verifyLinks.report} rel="noreferrer" target="_blank">
              Read the full report
            </a>
            <a className="button secondary" href={verifyLinks.data} rel="noreferrer" target="_blank">
              Download the data
            </a>
            <a className="button secondary" href={verifyLinks.tool} rel="noreferrer" target="_blank">
              Run it yourself
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
