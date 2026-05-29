// Small local-context graph for the structural / semantic validation screens.
// 3–10 nodes: the candidate's head → tail plus one shared-pattern anchor.

import { formatEntityDisplayParts, formatRelationLabel } from "./formatKgLabel";
import type { PresentationCandidate } from "./omniaPresentationData";
import type { PGraphEdge, PGraphEdgeKind, PGraphNode, PresentationGraph } from "./buildCandidateGraph";

const WIDTH = 720;
const HEIGHT = 320;

export function buildValidationGraph(
  candidate: PresentationCandidate | null,
  candidateEdgeKind: PGraphEdgeKind = "candidate",
): PresentationGraph | null {
  if (!candidate) return null;

  const headX = 150;
  const tailX = WIDTH - 150;
  const midY = 120;
  const anchorY = HEIGHT - 70;

  const headParts = formatEntityDisplayParts(candidate.head);
  const tailParts = formatEntityDisplayParts(candidate.tail);
  const nodes: PGraphNode[] = [
    { id: candidate.head, label: headParts.primary, subLabel: headParts.secondary, x: headX, y: midY, kind: "head", highlight: true },
    {
      id: `tail-${candidate.id}`,
      label: tailParts.primary,
      subLabel: tailParts.secondary,
      x: tailX,
      y: midY,
      kind: "candidateTail",
      highlight: true,
    },
  ];
  const edges: PGraphEdge[] = [
    {
      id: `cand-${candidate.id}`,
      source: candidate.head,
      target: `tail-${candidate.id}`,
      label: formatRelationLabel(candidate.relation),
      kind: candidateEdgeKind,
      highlight: true,
    },
  ];

  // Shared-pattern context: head already connects to the cluster's shared tail.
  if (candidate.sharedTail && candidate.sharedRelation) {
    const anchorId = `anchor-${candidate.sharedTail}`;
    const anchorParts = formatEntityDisplayParts(candidate.sharedTail);
    nodes.push({
      id: anchorId,
      label: anchorParts.primary,
      subLabel: anchorParts.secondary,
      x: WIDTH / 2,
      y: anchorY,
      kind: "tail",
    });
    edges.push({
      id: `ctx-${candidate.id}`,
      source: candidate.head,
      target: anchorId,
      label: "",
      kind: "known",
    });
  }

  return { width: WIDTH, height: HEIGHT, nodes, edges };
}
