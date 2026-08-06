export type WizardStep = "select" | "approve" | "migrate" | "done";

export const WIZARD_STEPS: readonly WizardStep[] = ["select", "approve", "migrate", "done"];

/**
 * The active wizard step. Assumes the wizard only renders when the wallet is
 * connected on the correct chain (gating happens in the page section above it).
 */
export function activeStep(input: {
  approved: boolean;
  selectedCount: number;
  migrated: boolean;
}): WizardStep {
  if (input.migrated) return "done";
  if (input.selectedCount === 0) return "select";
  if (!input.approved) return "approve";
  return "migrate";
}
