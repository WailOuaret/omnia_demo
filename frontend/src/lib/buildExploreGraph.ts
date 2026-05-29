// Explore-mode graphs: richer local context slices laid out with dagre.

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
  const normalized = (status || "").toLowerCase();
  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected" || normalized === "removed") return "rejected";
  if (normalized === "candidate" || normalized === "kept") return "candidate";
  return "known";
}

function layout(
  rawNodes: { id: string; label: string; kind: PGraphNodeKind; highlight?: boolean }[],
  rawEdges: PGraphEdge[],
  rankdir: "LR" | "TB" = "TB",
): PresentationGraph {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir, nodesep: 44, ranksep: 120, marginx: 28, marginy: 28 });

  for (const node of rawNodes) {
    graph.setNode(node.id, { width: nodeWidth(node.label), height: NODE_H });
  }
  for (const edge of rawEdges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source, edge.target);
  }
  dagre.layout(graph);

  let maxX = 0;
  let maxY = 0;
  const nodes: PGraphNode[] = rawNodes.map((node) => {
    const position = graph.node(node.id);
    maxX = Math.max(maxX, position.x);
    maxY = Math.max(maxY, position.y);
    return { ...node, x: position.x, y: position.y };
  });

  return {
    width: Math.max(640, maxX + 120),
    height: Math.max(320, maxY + 80),
    nodes,
    edges: rawEdges,
  };
}

export function buildExploreGraph(
  scenario: PresentationScenario,
  selectedCandidate: PresentationCandidate | null,
): PresentationGraph {
  const guidedNodes: PresentationGuidedNode[] = scenario.guided.nodes;
  const guidedEdges: PresentationGuidedEdge[] = scenario.guided.edges;
  if (guidedNodes.length === 0) {
    return { width: 640, height: 320, nodes: [], edges: [] };
  }

  const rawNodes = guidedNodes.map((node) => ({
    id: node.id,
    label: formatEntityLabel(node.id, node.label),
    kind: roleToKind(node.role),
    highlight:
      selectedCandidate != null &&
      (node.id === selectedCandidate.head || node.id === selectedCandidate.tail),
  }));

  const rawEdges: PGraphEdge[] = guidedEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.candidateId ? formatRelationLabel(edge.relation) : "",
    kind: statusToEdgeKind(edge.status),
    highlight: selectedCandidate != null && edge.candidateId === selectedCandidate.id,
  }));

  const result = layout(rawNodes, rawEdges);
  result.caption = "Local graph context";
  return result;
}

export function buildNeighbourhoodGraph(
  scenario: PresentationScenario,
  candidate: PresentationCandidate | null,
  candidateEdgeKind: PGraphEdgeKind = "candidate",
): PresentationGraph | null {
  if (!candidate) return null;
  const seeds = new Set<string>([candidate.head, candidate.tail]);
  if (candidate.sharedTail) seeds.add(candidate.sharedTail);

  const keep = new Set<string>(seeds);
  for (const edge of scenario.guided.edges) {
    if (seeds.has(edge.source)) keep.add(edge.target);
    if (seeds.has(edge.target)) keep.add(edge.source);
  }

  const labelById = new Map(scenario.guided.nodes.map((node) => [node.id, node.label]));
  const roleById = new Map(scenario.guided.nodes.map((node) => [node.id, node.role]));

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
  for (const edge of scenario.guided.edges) {
    if (!keep.has(edge.source) || !keep.has(edge.target)) continue;
    rawEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.candidateId ? formatRelationLabel(edge.relation) : "",
      kind: statusToEdgeKind(edge.status),
      highlight: edge.candidateId === candidate.id,
    });
  }

  if (!rawEdges.some((edge) => edge.highlight)) {
    rawEdges.push({
      id: `cand-${candidate.id}`,
      source: candidate.head,
      target: candidate.tail,
      label: formatRelationLabel(candidate.relation),
      kind: candidateEdgeKind,
      highlight: true,
    });
  } else {
    for (const edge of rawEdges) {
      if (edge.highlight) edge.kind = candidateEdgeKind;
    }
  }

  if (!rawNodes.some((node) => node.id === candidate.tail)) {
    rawNodes.push({
      id: candidate.tail,
      label: formatEntityLabel(candidate.tail),
      kind: "candidateTail",
      highlight: true,
    });
  }

  return layout(rawNodes, rawEdges, "LR");
}
