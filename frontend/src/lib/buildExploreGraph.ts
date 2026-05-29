// Explore-mode graphs: richer, real cluster-context slices laid out with dagre.
// Guided-mode graphs stay focused (see buildCandidateGraph / buildValidationGraph).

import dagre from "@dagrejs/dagre";
import { formatEntityLabel, formatRelationLabel } from "./formatKgLabel";
import type {
  PGraphEdge,
  PGraphEdgeKind,
  PGraphNode,
  PGraphNodeKind,
  PresentationGraph,
} from "./buildCandidateGraph";
import type {
  PresentationCandidate,
  PresentationGuidedEdge,
  PresentationGuidedNode,
  PresentationScenario,
} from "./omniaPresentationData";

const NODE_H = 30;

function nodeWidth(label: string): number {
  return Math.max(54, Math.min(150, 16 + label.length * 7.4));
}

function roleToKind(role: string): PGraphNodeKind {
  if (role === "shared_tail") return "tail";
  if (role === "cluster_member") return "member";
  if (role === "candidate_head" || role === "head") return "head";
  if (role === "context_tail" || role === "candidateTail") return "candidateTail";
  return "context";
}

function statusToEdgeKind(status: string): PGraphEdgeKind {
  const s = (status || "").toLowerCase();
  if (s === "accepted") return "accepted";
  if (s === "rejected" || s === "removed") return "rejected";
  if (s === "candidate" || s === "kept") return "candidate";
  return "known";
}

function layout(
  rawNodes: { id: string; label: string; kind: PGraphNodeKind; highlight?: boolean }[],
  rawEdges: PGraphEdge[],
  rankdir: "LR" | "TB" = "TB",
): PresentationGraph {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep: 44, ranksep: 120, marginx: 28, marginy: 28 });

  for (const n of rawNodes) {
    g.setNode(n.id, { width: nodeWidth(n.label), height: NODE_H });
  }
  for (const e of rawEdges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  let maxX = 0;
  let maxY = 0;
  const nodes: PGraphNode[] = rawNodes.map((n) => {
    const pos = g.node(n.id);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
    return { ...n, x: pos.x, y: pos.y };
  });

  return {
    width: Math.max(640, maxX + 120),
    height: Math.max(320, maxY + 80),
    nodes,
    edges: rawEdges,
  };
}

/** Full cluster-context slice for Explore mode on the Candidate Generation screen. */
export function buildExploreGraph(
  scenario: PresentationScenario,
  selectedCandidate: PresentationCandidate | null,
): PresentationGraph {
  const guidedNodes: PresentationGuidedNode[] = scenario.guided.nodes;
  const guidedEdges: PresentationGuidedEdge[] = scenario.guided.edges;
  if (guidedNodes.length === 0) {
    return { width: 640, height: 320, nodes: [], edges: [] };
  }

  const rawNodes = guidedNodes.map((n) => ({
    id: n.id,
    label: formatEntityLabel(n.id, n.label),
    kind: roleToKind(n.role),
    highlight:
      selectedCandidate != null &&
      (n.id === selectedCandidate.head || n.id === selectedCandidate.tail),
  }));

  const rawEdges: PGraphEdge[] = guidedEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.candidateId ? formatRelationLabel(e.relation) : "",
    kind: e.candidateId ? statusToEdgeKind(e.status) : statusToEdgeKind(e.status),
    highlight: selectedCandidate != null && e.candidateId === selectedCandidate.id,
  }));

  const result = layout(rawNodes, rawEdges);
  if (scenario.cluster.sharedRelation && scenario.cluster.sharedTail) {
    result.caption = `Shared pattern: ( · , ${formatRelationLabel(scenario.cluster.sharedRelation)}, ${formatEntityLabel(scenario.cluster.sharedTail)} )`;
  }
  return result;
}

/** Local neighbourhood around a candidate's head & tail for validation Explore mode. */
export function buildNeighbourhoodGraph(
  scenario: PresentationScenario,
  candidate: PresentationCandidate | null,
  candidateEdgeKind: PGraphEdgeKind = "candidate",
): PresentationGraph | null {
  if (!candidate) return null;
  const seeds = new Set<string>([candidate.head, candidate.tail]);
  if (candidate.sharedTail) seeds.add(candidate.sharedTail);

  // 1-hop neighbourhood of the seed nodes from the guided slice.
  const keep = new Set<string>(seeds);
  for (const e of scenario.guided.edges) {
    if (seeds.has(e.source)) keep.add(e.target);
    if (seeds.has(e.target)) keep.add(e.source);
  }

  const labelById = new Map(scenario.guided.nodes.map((n) => [n.id, n.label]));
  const roleById = new Map(scenario.guided.nodes.map((n) => [n.id, n.role]));

  const rawNodes = Array.from(keep).map((id) => ({
    id,
    label: formatEntityLabel(id, labelById.get(id)),
    kind:
      id === candidate.head
        ? ("head" as PGraphNodeKind)
        : id === candidate.tail
          ? ("candidateTail" as PGraphNodeKind)
          : roleToKind(roleById.get(id) ?? "context"),
    highlight: id === candidate.head || id === candidate.tail,
  }));

  const rawEdges: PGraphEdge[] = [];
  for (const e of scenario.guided.edges) {
    if (!keep.has(e.source) || !keep.has(e.target)) continue;
    rawEdges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.candidateId ? formatRelationLabel(e.relation) : "",
      kind: statusToEdgeKind(e.status),
      highlight: e.candidateId === candidate.id,
    });
  }
  // Ensure the candidate edge itself is present and styled.
  const candEdgeId = `cand-${candidate.id}`;
  if (!rawEdges.some((e) => e.highlight)) {
    rawEdges.push({
      id: candEdgeId,
      source: candidate.head,
      target: candidate.tail,
      label: formatRelationLabel(candidate.relation),
      kind: candidateEdgeKind,
      highlight: true,
    });
  } else {
    for (const e of rawEdges) {
      if (e.highlight) e.kind = candidateEdgeKind;
    }
  }

  // Guarantee the tail node exists even if the candidate edge was synthetic.
  if (!rawNodes.some((n) => n.id === candidate.tail)) {
    rawNodes.push({
      id: candidate.tail,
      label: formatEntityLabel(candidate.tail),
      kind: "candidateTail",
      highlight: true,
    });
  }

  return layout(rawNodes, rawEdges, "LR");
}
