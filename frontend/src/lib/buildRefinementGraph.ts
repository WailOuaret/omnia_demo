// Graph-refinement view: the candidate edge is recoloured by the user's
// decision (green = accepted, red = rejected). Rejected edges are still shown
// but visibly marked as not added.

import type { PresentationCandidate } from "./omniaPresentationData";
import type { PresentationGraph } from "./buildCandidateGraph";
import { buildValidationGraph } from "./buildValidationGraph";

export type RefinementDecision = "accepted" | "rejected" | "uncertain" | "corrected" | "none";

export function buildRefinementGraph(
  candidate: PresentationCandidate | null,
  decision: RefinementDecision,
): PresentationGraph | null {
  const edgeKind =
    decision === "accepted"
      ? "accepted"
      : decision === "rejected"
        ? "rejected"
        : decision === "uncertain"
          ? "uncertain"
          : decision === "corrected"
            ? "corrected"
            : "candidate";
  return buildValidationGraph(candidate, edgeKind);
}
