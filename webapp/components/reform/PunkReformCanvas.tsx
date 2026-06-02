"use client";

import { useEffect, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type Pixel = Point & {
  color: string;
  key: string;
};

type Particle = {
  color: string;
  current: Point;
  delay: number;
  path: Point[];
  segment: number;
};

type ReformEngine = {
  complete: boolean;
  particles: Particle[];
  settledAt: number | null;
};

type LoadedFrames = {
  requestKey: string;
  sequence?: Pixel[][];
  sequenceTokenIds?: readonly number[];
  source: Pixel[];
  target: Pixel[];
};

type PunkReformCanvasProps = {
  active: boolean;
  batchSize: number;
  cycleTokenIds?: readonly number[];
  decorative?: boolean;
  fromTokenId: number;
  loop: boolean;
  loopPauseMs?: number;
  onComplete?: () => void;
  onSequenceEnd?: (lastTokenId: number) => void;
  playKey: number;
  seed: number;
  speed: number;
  toTokenId: number;
  turbulence: number;
  variant?: "bare" | "mark" | "stage";
};

const GRID_SIZE = 24;
const TICK_MS = 42;
const LOOP_PAUSE_MS = 780;

export function PunkReformCanvas({
  active,
  batchSize,
  cycleTokenIds,
  decorative = false,
  fromTokenId,
  loop,
  loopPauseMs = LOOP_PAUSE_MS,
  onComplete,
  onSequenceEnd,
  playKey,
  seed,
  speed,
  toTokenId,
  turbulence,
  variant = "stage",
}: PunkReformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completeRef = useRef(onComplete);
  const speedRef = useRef(speed);
  const [frames, setFrames] = useState<LoadedFrames | null>(null);
  const [failedRequestKey, setFailedRequestKey] = useState<string | null>(null);
  const requestKey = cycleTokenIds?.length ? cycleTokenIds.join(",") : `${fromTokenId},${toTokenId}`;
  const resolvedFrames = frames?.requestKey === requestKey ? frames : null;
  const failed = failedRequestKey === requestKey;

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    const sequenceIds = cycleTokenIds?.length ? cycleTokenIds : [fromTokenId, toTokenId];

    Promise.all(sequenceIds.map((tokenId) => loadPixels(tokenId)))
      .then((loadedFrames) => {
        if (!cancelled) {
          const source = loadedFrames[0];
          const target = loadedFrames[1] ?? source;
          setFrames({
            requestKey,
            source,
            target,
            sequence: cycleTokenIds && cycleTokenIds.length > 1 ? loadedFrames : undefined,
            sequenceTokenIds: cycleTokenIds && cycleTokenIds.length > 1 ? [...sequenceIds] : undefined,
          });
          setFailedRequestKey(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailedRequestKey(requestKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cycleTokenIds, fromTokenId, requestKey, toTokenId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !resolvedFrames) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let lastTime = performance.now();
    let accumulated = 0;
    let cycle = 0;
    let engine = buildEngine(resolvedFrames.source, resolvedFrames.target, seed, batchSize, turbulence);
    let displayedPixels = resolvedFrames.target;
    let completionReported = false;
    context.imageSmoothingEnabled = false;

    if (!active || reduceMotion) {
      drawPixels(context, active ? resolvedFrames.target : resolvedFrames.source);

      if (active && reduceMotion && !loop) {
        animationFrame = requestAnimationFrame(() => completeRef.current?.());
        return () => cancelAnimationFrame(animationFrame);
      }

      return;
    }

    const animate = (now: number) => {
      if (document.hidden) {
        lastTime = now;
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      accumulated += Math.min(now - lastTime, 100);
      lastTime = now;

      while (accumulated >= TICK_MS && !engine.complete) {
        advanceEngine(engine, speedRef.current);
        accumulated -= TICK_MS;
      }

      if (engine.complete) {
        drawPixels(context, displayedPixels);
        engine.settledAt ??= now;

        if (!loop && !completionReported) {
          completionReported = true;
          completeRef.current?.();
        }

        if (loop && now - engine.settledAt >= loopPauseMs) {
          if (resolvedFrames.sequence && onSequenceEnd && cycle >= resolvedFrames.sequence.length - 2) {
            const finalTokenId = resolvedFrames.sequenceTokenIds?.[resolvedFrames.sequence.length - 1];

            if (finalTokenId !== undefined) {
              engine.settledAt = Number.POSITIVE_INFINITY;
              onSequenceEnd(finalTokenId);
              animationFrame = requestAnimationFrame(animate);
              return;
            }
          }

          cycle += 1;
          if (resolvedFrames.sequence?.length) {
            const source = resolvedFrames.sequence[cycle % resolvedFrames.sequence.length];
            const target = resolvedFrames.sequence[(cycle + 1) % resolvedFrames.sequence.length];
            displayedPixels = target;
            engine = buildEngine(source, target, seed + cycle * 97, batchSize, turbulence);
          } else {
            engine = buildEngine(resolvedFrames.target, resolvedFrames.target, seed + cycle * 97, batchSize, turbulence);
          }
          accumulated = 0;
        }
      } else {
        drawParticles(context, engine.particles);
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [active, batchSize, loop, loopPauseMs, onSequenceEnd, playKey, resolvedFrames, seed, turbulence]);

  return (
    <div className={`reform-canvas-frame reform-canvas-${variant}`}>
      <canvas
        ref={canvasRef}
        className="reform-canvas"
        width={GRID_SIZE}
        height={GRID_SIZE}
        style={!resolvedFrames ? { backgroundImage: `url("/art/punk/${fromTokenId}")` } : undefined}
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : `Animated ExpansionPunk from ${fromTokenId} to ${toTokenId}`}
      />
      {variant === "stage" && !resolvedFrames && !failed ? <span className="reform-canvas-message">Loading</span> : null}
      {variant === "stage" && failed ? <span className="reform-canvas-message">Artwork unavailable</span> : null}
    </div>
  );
}

async function loadPixels(tokenId: number) {
  const image = await loadImage(`/art/punk/${tokenId}`);
  const buffer = document.createElement("canvas");
  buffer.width = GRID_SIZE;
  buffer.height = GRID_SIZE;
  const context = buffer.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas not available.");
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, GRID_SIZE, GRID_SIZE);
  const data = context.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
  const pixels: Pixel[] = [];

  for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
    const offset = index * 4;
    const alpha = data[offset + 3];

    if (alpha === 0) continue;

    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const key = `${red},${green},${blue},${alpha}`;
    pixels.push({
      color: `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`,
      key,
      x: index % GRID_SIZE,
      y: Math.floor(index / GRID_SIZE),
    });
  }

  return pixels;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function buildEngine(
  source: Pixel[],
  target: Pixel[],
  seed: number,
  batchSize: number,
  turbulence: number,
): ReformEngine {
  const random = createRandom(seed);
  const sourceByColor = groupByColor(source);
  const targetByColor = groupByColor(target);
  const pairs: Array<{ start: Point | null; end: Point | null; color: string }> = [];
  const colorKeys = new Set([...sourceByColor.keys(), ...targetByColor.keys()]);

  for (const key of colorKeys) {
    const starts = shuffle([...(sourceByColor.get(key) ?? [])], random);
    const ends = shuffle([...(targetByColor.get(key) ?? [])], random);
    const shared = Math.min(starts.length, ends.length);

    if (shared > 1 && starts.every((pixel, index) => pixel.x === ends[index]?.x && pixel.y === ends[index]?.y)) {
      ends.push(ends.shift()!);
    }

    for (let index = 0; index < shared; index += 1) {
      pairs.push({ start: starts[index], end: ends[index], color: starts[index].color });
    }

    for (const pixel of starts.slice(shared)) {
      pairs.push({ start: pixel, end: null, color: pixel.color });
    }

    for (const pixel of ends.slice(shared)) {
      pairs.push({ start: null, end: pixel, color: pixel.color });
    }
  }

  const shuffledPairs = shuffle(pairs, random);
  const particles: Particle[] = [];

  for (let offset = 0; offset < shuffledPairs.length; offset += batchSize) {
    const group = shuffledPairs.slice(offset, offset + batchSize);
    const delay = Math.floor(random() * 15);
    const angle = random() * Math.PI * 2;
    const strength = turbulence * (2.2 + random() * 5.2);
    const drift = {
      x: Math.round(Math.cos(angle) * strength),
      y: Math.round(Math.sin(angle) * strength),
    };

    for (const pair of group) {
      const start = pair.start ?? outsidePoint(pair.end!, random);
      const end = pair.end ?? outsidePoint(pair.start!, random);
      const jitter = Math.round(turbulence * (random() - 0.5) * 1.7);
      particles.push({
        color: pair.color,
        current: { ...start },
        delay,
        path: [
          start,
          snapPoint({
            x: start.x + (end.x - start.x) * 0.34 + drift.x + jitter,
            y: start.y + (end.y - start.y) * 0.34 + drift.y - jitter,
          }),
          snapPoint({
            x: start.x + (end.x - start.x) * 0.68 + drift.x * 0.55 - jitter,
            y: start.y + (end.y - start.y) * 0.68 + drift.y * 0.55 + jitter,
          }),
          end,
        ],
        segment: 1,
      });
    }
  }

  return {
    complete: false,
    particles,
    settledAt: null,
  };
}

function advanceEngine(engine: ReformEngine, maximumStep: number) {
  let complete = true;

  for (const particle of engine.particles) {
    if (particle.delay > 0) {
      particle.delay -= 1;
      complete = false;
      continue;
    }

    let remainingSteps = Math.max(1, Math.round(maximumStep));

    while (remainingSteps > 0 && particle.segment < particle.path.length) {
      const target = particle.path[particle.segment];

      if (particle.current.x === target.x && particle.current.y === target.y) {
        particle.segment += 1;
      } else {
        particle.current = moveOneCell(particle.current, target);
        remainingSteps -= 1;
      }
    }

    if (particle.segment < particle.path.length) {
      complete = false;
    }
  }

  engine.complete = complete;
}

function drawPixels(context: CanvasRenderingContext2D, pixels: Pixel[]) {
  context.clearRect(0, 0, GRID_SIZE, GRID_SIZE);

  for (const pixel of pixels) {
    context.fillStyle = pixel.color;
    context.fillRect(pixel.x, pixel.y, 1, 1);
  }
}

function drawParticles(context: CanvasRenderingContext2D, particles: Particle[]) {
  context.clearRect(0, 0, GRID_SIZE, GRID_SIZE);

  for (const particle of particles) {
    context.fillStyle = particle.color;
    context.fillRect(particle.current.x, particle.current.y, 1, 1);
  }
}

function groupByColor(pixels: Pixel[]) {
  const groups = new Map<string, Pixel[]>();

  for (const pixel of pixels) {
    const group = groups.get(pixel.key) ?? [];
    group.push(pixel);
    groups.set(pixel.key, group);
  }

  return groups;
}

function outsidePoint(anchor: Point, random: () => number): Point {
  const edge = Math.floor(random() * 4);
  const padding = 3 + Math.floor(random() * 7);
  const crossAxis = (value: number) => Math.round(value + (random() - 0.5) * 8);

  if (edge === 0) return { x: -padding, y: crossAxis(anchor.y) };
  if (edge === 1) return { x: GRID_SIZE + padding, y: crossAxis(anchor.y) };
  if (edge === 2) return { x: crossAxis(anchor.x), y: -padding };
  return { x: crossAxis(anchor.x), y: GRID_SIZE + padding };
}

function moveOneCell(current: Point, target: Point): Point {
  const horizontal = target.x - current.x;
  const vertical = target.y - current.y;

  if (horizontal !== 0 && Math.abs(horizontal) >= Math.abs(vertical)) {
    return { x: current.x + Math.sign(horizontal), y: current.y };
  }

  return { x: current.x, y: current.y + Math.sign(vertical) };
}

function snapPoint(point: Point): Point {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };
}

function shuffle<T>(values: T[], random: () => number) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }

  return values;
}

function createRandom(seed: number) {
  let current = seed >>> 0;

  return () => {
    current += 0x6d2b79f5;
    let value = Math.imul(current ^ (current >>> 15), 1 | current);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
