"use client";

import { useCallback, useState } from "react";
import { PunkReformCanvas } from "@/components/reform/PunkReformCanvas";

const MORPH_SEQUENCE_LENGTH = 6;

export function HeaderMorphPunk() {
  const [sequence, setSequence] = useState(() => randomTokenSequence(MORPH_SEQUENCE_LENGTH));
  const continueWithRandomPunks = useCallback((visibleTokenId: number) => {
    setSequence(randomTokenSequence(MORPH_SEQUENCE_LENGTH, visibleTokenId));
  }, []);

  return (
    <PunkReformCanvas
      active
      batchSize={12}
      cycleTokenIds={sequence}
      decorative
      fromTokenId={sequence[0]}
      loop
      loopPauseMs={1100}
      onSequenceEnd={continueWithRandomPunks}
      playKey={0}
      seed={10043}
      speed={1}
      toTokenId={sequence[1]}
      turbulence={0.32}
      variant="mark"
    />
  );
}

function randomTokenSequence(length: number, firstTokenId?: number) {
  const tokenIds = new Set<number>(firstTokenId ? [firstTokenId] : []);

  while (tokenIds.size < length) {
    tokenIds.add(10000 + Math.floor(Math.random() * 10000));
  }

  return [...tokenIds];
}
