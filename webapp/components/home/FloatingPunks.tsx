"use client";

import { motion, useReducedMotion } from "motion/react";
import { heroPunks } from "@/lib/site-data";
import { ClickableReformPunk } from "@/components/reform/ClickableReformPunk";

export function FloatingPunks() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="punk-stage" aria-label="ExpansionPunks artwork gallery">
      {heroPunks.map((punk) => (
        <motion.div
          className={`float-punk ${punk.className}`}
          key={punk.tokenId}
          animate={
            reduceMotion
              ? undefined
              : {
                  y: [0, -7, 0],
                }
          }
          transition={{
            duration: 4.6,
            delay: punk.delay,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <ClickableReformPunk tokenId={punk.tokenId} priority />
        </motion.div>
      ))}
    </div>
  );
}
