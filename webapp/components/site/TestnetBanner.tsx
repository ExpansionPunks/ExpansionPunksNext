import { stageConfig } from "@/lib/stage";

export function TestnetBanner() {
  if (stageConfig.stage !== "testnet") return null;
  return (
    <div className="testnet-banner-global" role="alert">
      TESTNET REHEARSAL — these are not real punks, not mainnet, no value.
    </div>
  );
}
