// Deterministic, overlap-free layouts for the guided demo graphs.
// We render with plain SVG (see GraphPreviewCard) so we fully control spacing
// and never produce vertical node piles or overlapping labels.

import { formatEntityLabel, formatRelationLabel } from "./formatKgLabel";
import type { PresentationCandidate, PresentationScenario } from "./omniaPresentationData";

export type PGraphNodeKind = "tail" | "member" | "candidateTail" | "head" | "context";
export type PGraphEdgeKind =
  | "known"
  | "candidate"
  | "proposed"
  | "accepted"
  | "rejected"
  | "uncertain"
  | "corrected";

export interface PGraphNode {
  id: string;
  label: string;
  subLabel?: string;
  x: number;
  y: number;
  kind: PGraphNodeKind;
  highlight?: boolean;
}

export interface PGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: PGraphEdgeKind;
  highlight?: boolean;
}

export interface PresentationGraph {
  width: number;
  height: number;
  nodes: PGraphNode[];
  edges: PGraphEdge[];
  caption?: string;
  overflow?: {
    knownMore: number;
    candidateMore: number;
  };
}

const WIDTH = 760;
const HEIGHT = 440;

/**
 * Candidate-generation view: shows the selected relation-tail cluster as a
 * hub-and-spoke star (members → shared tail) plus dashed candidate stubs.
 * 8–25 readable nodes max.
 */
export function buildCandidateGraph(
  scenario: PresentationScenario,
  selectedCandidate: PresentationCandidate | null,
): PresentationGraph {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const ringR = 150;
  const candR = 270;

  const sharedTail = scenario.cluster.sharedTail;
  const sharedRelation = scenario.cluster.sharedRelation;
  const members = scenario.cluster.members.slice(0, 8);

  const nodes: PGraphNode[] = [];
  const edges: PGraphEdge[] = [];

  if (sharedTail) {
    nodes.push({
      id: sharedTail,
      label: formatEntityLabel(sharedTail),
      x: cx,
      y: cy,
      kind: "tail",
      highlight: true,
    });
  }

  const memberAngle = (i: number) => (2 * Math.PI * i) / Math.max(members.length, 1) - Math.PI / 2;
  const memberPos = new Map<string, { x: number; y: number; angle: number }>();
  members.forEach((memberId, i) => {
    const angle = memberAngle(i);
    const x = cx + ringR * Math.cos(angle);
    const y = cy + ringR * Math.sin(angle);
    memberPos.set(memberId, { x, y, angle });
    nodes.push({ id: memberId, label: formatEntityLabel(memberId), x, y, kind: "member" });
    if (sharedTail) {
      edges.push({
        id: `know-${memberId}`,
        source: memberId,
        target: sharedTail,
        label: "",
        kind: "known",
      });
    }
  });

  // Show up to 3 proposed candidates as outward dashed stubs from their head.
  const shownCandidates = scenario.candidates
    .filter((c) => c.head)
    .slice(0, 3);
  shownCandidates.forEach((candidate, idx) => {
    const base = memberPos.get(candidate.head);
    const angle = base ? base.angle : memberAngle(idx) + 0.35;
    const x = cx + candR * Math.cos(angle);
    const y = cy + candR * Math.sin(angle);
    const tailNodeId = `cand-tail-${candidate.id}`;
    nodes.push({
      id: tailNodeId,
      label: formatEntityLabel(candidate.tail),
      x,
      y,
      kind: "candidateTail",
      highlight: selectedCandidate?.id === candidate.id,
    });
    if (!base) {
      // Head is not one of the displayed members — add a small head node.
      const hx = cx + ringR * Math.cos(angle);
      const hy = cy + ringR * Math.sin(angle);
      nodes.push({ id: candidate.head, label: formatEntityLabel(candidate.head), x: hx, y: hy, kind: "member" });
      memberPos.set(candidate.head, { x: hx, y: hy, angle });
    }
    edges.push({
      id: `cand-${candidate.id}`,
      source: candidate.head,
      target: tailNodeId,
      label: formatRelationLabel(candidate.relation),
      kind: "candidate",
      highlight: selectedCandidate?.id === candidate.id,
    });
  });

  const caption = sharedRelation && sharedTail
    ? `Shared pattern: ( · , ${formatRelationLabel(sharedRelation)}, ${formatEntityLabel(sharedTail)} )`
    : undefined;

  return { width: WIDTH, height: HEIGHT, nodes, edges, caption };
}
