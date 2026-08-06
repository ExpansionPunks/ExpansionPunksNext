"use client";

import Link from "next/link";
import { useState } from "react";
import { WIZARD_STEPS } from "@/components/holder/wizard-steps";
import { useMigrationWizard } from "@/components/holder/useMigrationWizard";
import { activeMigrationContracts } from "@/lib/migration-contracts";

const STEP_LABEL: Record<string, string> = {
  select: "Select",
  approve: "Approve",
  migrate: "Migrate",
  done: "Done",
};

export function MigrationWizard({ onClose }: { onClose: () => void }) {
  const w = useMigrationWizard();
  const [refining, setRefining] = useState(false);

  if (!w.correctNetwork) {
    return (
      <div className="wizard-gate">
        <strong>Wrong network.</strong>
        <button
          className="button dark"
          type="button"
          disabled={w.switchingNetwork}
          onClick={w.switchNetwork}
        >
          {w.switchingNetwork ? "Switching…" : `Switch to ${activeMigrationContracts.chainLabel}`}
        </button>
      </div>
    );
  }

  if (w.eligible.length === 0 && !w.migrated) {
    return <p className="wizard-note">No legacy xPunks left to migrate.</p>;
  }

  return (
    <div className="wizard">
      <ol className="wizard-stepper" aria-label="Migration steps">
        {WIZARD_STEPS.map((s) => (
          <li key={s} className={w.step === s ? "active" : ""}>
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      {w.step !== "done" ? (
        <div className="wizard-select">
          {!w.approved ? (
            <button
              className="button dark"
              type="button"
              disabled={w.busy}
              onClick={w.approve}
            >
              Approve migration
            </button>
          ) : (
            <button
              className="button dark"
              type="button"
              disabled={w.selectedCount === 0 || w.busy}
              onClick={w.migrate}
            >
              {w.selectedCount === 1
                ? `Migrate #${w.selected[0]}`
                : `Migrate all ${w.selectedCount}`}
            </button>
          )}

          <button
            className="wizard-refine"
            type="button"
            onClick={() => setRefining((r) => !r)}
          >
            choose which {refining ? "▴" : "▾"}
          </button>

          {refining ? (
            <div className="wizard-checklist" aria-label="Choose xPunks to migrate">
              {w.eligible.map((id) => {
                const checked = w.selected.some((s) => s === id);
                return (
                  <label key={id.toString()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        w.setSelected(
                          checked
                            ? w.selected.filter((s) => s !== id)
                            : [...w.selected, id],
                        )
                      }
                    />
                    <span>#{id.toString()}</span>
                  </label>
                );
              })}
            </div>
          ) : null}

          <p className="wizard-note">
            Approval is reversible; migration burns the legacy token and mints the same ID onchain.
          </p>
        </div>
      ) : (
        <div className="wizard-done">
          <strong>{w.tx.message || "Migration complete."}</strong>
          {w.remaining > 0 ? (
            <button className="button dark" type="button" onClick={w.reset}>
              Migrate remaining {w.remaining}
            </button>
          ) : null}
          <Link href="#rewards" onClick={onClose}>See your rewards ↓</Link>
        </div>
      )}

      {w.tx.phase !== "idle" ? (
        <div className={`transaction-feedback ${w.tx.phase}`} role="status">
          <p>{w.tx.message}</p>
          {w.tx.hash ? (
            <a
              href={`${activeMigrationContracts.explorerBaseUrl}/tx/${w.tx.hash}`}
              rel="noreferrer"
              target="_blank"
            >
              View transaction
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
