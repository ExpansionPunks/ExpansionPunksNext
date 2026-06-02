"use client";

import { useState } from "react";
import { PunkReformCanvas } from "@/components/reform/PunkReformCanvas";
import { PunkImage } from "@/components/ui/PunkImage";
import { morphPool } from "@/lib/site-data";

type ClickableReformPunkProps = {
  priority?: boolean;
  tokenId: number;
};

export function ClickableReformPunk({ priority = false, tokenId }: ClickableReformPunkProps) {
  const [displayedTokenId, setDisplayedTokenId] = useState(tokenId);
  const [targetTokenId, setTargetTokenId] = useState(tokenId);
  const [playKey, setPlayKey] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [reforming, setReforming] = useState(false);

  function reform() {
    if (reforming) return;

    setTargetTokenId(randomTokenIdExcluding(displayedTokenId));
    setHasAnimated(true);
    setReforming(true);
    setPlayKey((current) => current + 1);
  }

  function finishReform() {
    setDisplayedTokenId(targetTokenId);
    setReforming(false);
  }

  return (
    <button
      className="clickable-reform-punk"
      type="button"
      onClick={reform}
      disabled={reforming}
      aria-label={reforming ? "ExpansionPunk reforming" : `Reform ExpansionPunk #${displayedTokenId}`}
    >
      {hasAnimated ? (
        <PunkReformCanvas
          active={reforming}
          batchSize={9}
          decorative
          fromTokenId={displayedTokenId}
          loop={false}
          onComplete={finishReform}
          playKey={playKey}
          seed={displayedTokenId + playKey * 73}
          speed={2}
          toTokenId={targetTokenId}
          turbulence={0.5}
          variant="bare"
        />
      ) : (
        <PunkImage tokenId={displayedTokenId} priority={priority} />
      )}
    </button>
  );
}

function randomTokenIdExcluding(excludedTokenId: number) {
  let tokenId = excludedTokenId;

  while (tokenId === excludedTokenId) {
    tokenId = morphPool[Math.floor(Math.random() * morphPool.length)];
  }

  return tokenId;
}
