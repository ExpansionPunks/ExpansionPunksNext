"use client";

import { useState } from "react";
import { PunkReformCanvas } from "@/components/reform/PunkReformCanvas";

type MotionMode = "living" | "migration" | "morph";

export function PunkReformPlayground() {
  const [mode, setMode] = useState<MotionMode>("living");
  const [sourceTokenId, setSourceTokenId] = useState(18108);
  const [targetTokenId, setTargetTokenId] = useState(12238);
  const [speed, setSpeed] = useState(1);
  const [turbulence, setTurbulence] = useState(0.65);
  const [batchSize, setBatchSize] = useState(8);
  const [seed, setSeed] = useState(18108);
  const [playKey, setPlayKey] = useState(0);
  const [ambientRunning, setAmbientRunning] = useState(true);
  const [hasManualRun, setHasManualRun] = useState(false);
  const resolvedTargetTokenId = mode === "morph" ? targetTokenId : sourceTokenId;
  const active = mode === "living" ? ambientRunning : hasManualRun;

  function selectMode(nextMode: MotionMode) {
    setMode(nextMode);
    setHasManualRun(false);
    setAmbientRunning(nextMode === "living");
    setPlayKey((current) => current + 1);
  }

  function runMotion() {
    if (mode === "living") {
      setAmbientRunning((current) => !current);
      return;
    }

    setHasManualRun(true);
    setPlayKey((current) => current + 1);
  }

  return (
    <section className="content-band reform-lab">
      <div className="reform-stage">
        <div className="reform-canvas-header">
          <strong>
            {mode === "living" ? `#${sourceTokenId}` : `#${sourceTokenId} -> #${resolvedTargetTokenId}`}
          </strong>
          <span>{mode === "living" ? "Continuous" : "One shot"}</span>
        </div>
        <PunkReformCanvas
          active={active}
          batchSize={batchSize}
          fromTokenId={sourceTokenId}
          loop={mode === "living"}
          playKey={playKey}
          seed={seed}
          speed={speed}
          toTokenId={resolvedTargetTokenId}
          turbulence={turbulence}
        />
      </div>
      <div className="reform-controls">
        <div className="reform-mode" role="group" aria-label="Motion mode">
          <button className={mode === "living" ? "selected" : ""} type="button" onClick={() => selectMode("living")}>
            Living
          </button>
          <button className={mode === "migration" ? "selected" : ""} type="button" onClick={() => selectMode("migration")}>
            Migration
          </button>
          <button className={mode === "morph" ? "selected" : ""} type="button" onClick={() => selectMode("morph")}>
            Morph
          </button>
        </div>
        <div className="reform-fields">
          <NumericControl
            label={mode === "morph" ? "Source punk" : "Punk"}
            max={19999}
            min={10000}
            value={sourceTokenId}
            onChange={setSourceTokenId}
          />
          {mode === "morph" ? (
            <NumericControl
              label="Target punk"
              max={19999}
              min={10000}
              value={targetTokenId}
              onChange={setTargetTokenId}
            />
          ) : null}
          <RangeControl
            label="Speed"
            value={speed}
            display={`${speed} ${speed === 1 ? "cell" : "cells"} / turn`}
            min={1}
            max={6}
            step={1}
            onChange={setSpeed}
          />
          <RangeControl
            label="Turbulence"
            value={turbulence}
            display={turbulence.toFixed(2)}
            min={0}
            max={1}
            step={0.05}
            onChange={setTurbulence}
          />
          <RangeControl
            label="Batch size"
            value={batchSize}
            display={`${batchSize} pixels`}
            min={2}
            max={28}
            step={1}
            onChange={setBatchSize}
          />
          <NumericControl label="Seed" max={999999} min={1} value={seed} onChange={setSeed} />
        </div>
        <div className="reform-command">
          <button className="button dark" type="button" onClick={runMotion}>
            {mode === "living"
              ? ambientRunning
                ? "Pause"
                : "Resume"
              : mode === "migration"
                ? "Rebuild"
                : "Reform"}
          </button>
          {mode !== "living" ? (
            <button
              className="button secondary"
              type="button"
              onClick={() => setSeed((current) => current + 1)}
            >
              New pattern
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function NumericControl({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="reform-input">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isInteger(nextValue) && nextValue >= min && nextValue <= max) {
            onChange(nextValue);
          }
        }}
      />
    </label>
  );
}

function RangeControl({
  display,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  display: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="reform-range">
      <span>
        <b>{label}</b>
        <output>{display}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
