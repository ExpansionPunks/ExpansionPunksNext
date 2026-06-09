import { PunkImage } from "@/components/ui/PunkImage";

type NodeProps = {
  className: string;
  title: string;
  copy: string;
  marker?: boolean;
};

function TimelineNode({ className, title, copy, marker = false }: NodeProps) {
  return (
    <article className={`timeline-node ${className}`}>
      {marker ? (
        <div className="timeline-marker" aria-hidden="true">
          <span>We are here</span>
          <PunkImage tokenId={18108} decorative />
        </div>
      ) : null}
      <b>{title}</b>
      <span>{copy}</span>
    </article>
  );
}

function Delay({ className, children }: { className: string; children: string }) {
  return (
    <div className={`timeline-delay ${className}`}>
      <span>{children}</span>
    </div>
  );
}

export function ExecutionMap() {
  return (
    <div className="timeline-shell">
      <div className="timeline-legend" aria-label="Execution status">
        <span className="done">Done</span>
        <span className="current">Working now</span>
        <span className="open">Open</span>
      </div>
      <div className="timeline-board" aria-label="ExpansionPunks Next aligned execution flow">
        <div className="timeline-launch tc7" aria-hidden="true">
          <span>ExpansionPunks Next</span>
        </div>

        <div className="timeline-lane migration tc1 tr1">
          Migration <small>holder migration path</small>
        </div>
        <div className="timeline-lane dao tc1 tr2">
          DAO <small>funding, payment, custody</small>
        </div>
        <div className="timeline-lane events tc1 tr3">
          Events <small>DAO-owned xPunks</small>
        </div>
        <div className="timeline-lane grants tc1 tr4">
          Grants <small>12-month programme</small>
        </div>
        <div className="timeline-lane stewardship tc1 tr5">
          Stewardship <small>CP #2321</small>
        </div>

        <TimelineNode className="origin tc2" title="XIPs pass" copy="XIP 24 and 25 approved." />

        <TimelineNode className="done migration-node tc3 tr1" title="Testnet build" copy="Sepolia build is live." />
        <TimelineNode
          className="done migration-node tc4 tr1"
          title="Verify 10k"
          copy="Every punk confirmed to match."
        />
        <TimelineNode
          className="current migration-node tc5 tr1"
          title="Preflight"
          copy="Audit and rehearse mainnet."
          marker
        />
        <TimelineNode className="migration-node tc6 tr1" title="Mainnet deploy" copy="Deploy and publish addresses." />
        <TimelineNode className="migration-node tc7 tr1" title="Migration begins" copy="Launch the website." />
        <Delay className="tc8 tr1">4 weeks</Delay>
        <TimelineNode className="migration-node tc9 tr1" title="Launch support ends" copy="Discord support and bug fixes wrap." />
        <Delay className="tc10 tr1 wide">12 months</Delay>
        <TimelineNode className="migration-node tc14 tr1" title="Reward window ends" copy="Claims close." />
        <TimelineNode className="migration-node end tc15 tr1" title="Redistribute" copy="Leftovers shared pro rata." />

        <TimelineNode className="dao-node tc5 tr2" title="Final tally" copy="Lock costs and pool sizes." />
        <TimelineNode className="dao-node tc6 tr2" title="Dev milestone" copy="First 5 ETH payment." />
        <TimelineNode className="dao-node tc7 tr2" title="Fund reward pools" copy="Base + participation pools." />
        <Delay className="tc8 tr2">4 weeks</Delay>
        <TimelineNode className="dao-node end tc9 tr2" title="DAO closes" copy="Second 5 ETH paid. Safe winds down." />

        <TimelineNode className="events-node tc9 tr3" title="Raffle 1" copy="First 10 DAO xPunks." />
        <Delay className="tc10 tr3">1 month</Delay>
        <TimelineNode className="events-node tc11 tr3" title="Raffle 2" copy="Second 10 DAO xPunks." />
        <Delay className="tc12 tr3">1 month</Delay>
        <TimelineNode className="events-node end tc13 tr3" title="Raffle 3" copy="Final 10 DAO xPunks." />

        <TimelineNode className="grants-node span tc9 tr4" title="Grants programme" copy="Monthly grants for 12 months." />
        <TimelineNode
          className="stewardship-node span tc9 tr5"
          title="CP #2321 stewardship"
          copy="Starts at DAO shutdown and continues at least 3 years."
        />
      </div>
    </div>
  );
}
