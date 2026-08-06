export type Phase = "reward" | "latch" | "terminal";

export interface PhaseResult {
  phase: Phase;
  /** Unix timestamp (seconds) when the reward window ends */
  rewardEnds: number;
  /** Unix timestamp (seconds) when the latch window ends */
  latchEnds: number;
}

export interface PhaseArgs {
  start: bigint;
  rewardWindow: bigint;
  latchWindow: bigint;
  now: bigint;
}

/**
 * Pure function that mirrors the contract's phase logic.
 * now < start + rewardWindow  → "reward"
 * now < start + latchWindow   → "latch"
 * else                        → "terminal"
 */
export function phaseOf({ start, rewardWindow, latchWindow, now }: PhaseArgs): PhaseResult {
  const rewardEnds = Number(start + rewardWindow);
  const latchEnds = Number(start + latchWindow);

  let phase: Phase;

  if (now < start + rewardWindow) {
    phase = "reward";
  } else if (now < start + latchWindow) {
    phase = "latch";
  } else {
    phase = "terminal";
  }

  return { phase, rewardEnds, latchEnds };
}
