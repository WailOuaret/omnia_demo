// Entity / relation centric graphs for Candidate Generation (red dashed = proposed).

import { formatEntityDisplayParts, formatEntityLabel, formatRelationLabel } from "./formatKgLabel";
import type { PGraphEdge, PGraphNode, PresentationGraph } from "./buildCandidateGraph";
import type { ExplorerTriple, KnownEdge, OmniaCandidateExplorer } from "./omniaCandidateExplorer";

const W = 760;
const H = 420;
const GUIDED_EDGE_CAP = 8;
const EXPLORE_EDGE_CAP = 14;

function radialPlace(
  centerId: string,
  nodeIds: Set<string>,
  labels: Map<string, string>,
  centerHighlight: boolean,
  highlightIds: Set<string>,
): PGraphNode[] {
  const cx = W / 2;
  const cy = H / 2;
  const others = [...nodeIds].filter((id) => id !== centerId);
  const labelFor = (id: string) => {
    const parts = formatEntityDisplayParts(id, labels.get(id));
    return { label: parts.primary, subLabel: parts.secondary };
  };
  const centerParts = labelFor(centerId);
  const nodes: PGraphNode[] = [
    {
      id: centerId,
      label: centerParts.label,
      subLabel: centerParts.subLabel,
      x: cx,
      y: cy,
      kind: "head",
      highlight: centerHighlight || highlightIds.has(centerId),
    },
  ];
  const ringR = others.length > 12 ? 200 : 160;
  others.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(others.length, 1) - Math.PI / 2;
    const parts = labelFor(id);
    nodes.push({
      id,
      label: parts.label,
      subLabel: parts.subLabel,
      x: cx + ringR * Math.cos(angle),
      y: cy + ringR * Math.sin(angle),
      kind: highlightIds.has(id) ? "candidateTail" : "context",
      highlight: highlightIds.has(id),
    });
  });
  return nodes;
}

function collectNeighbours(
  seed: string,
  knownEdges: KnownEdge[],
  hops: number,
  cap: number,
): Set<string> {
  const keep = new Set<string>([seed]);
  let frontier = new Set<string>([seed]);
  for (let h = 0; h < hops; h++) {
    const next = new Set<string>();
    for (const edge of knownEdges) {
      if (frontier.has(edge.source)) {
        next.add(edge.target);
        keep.add(edge.target);
      }
      if (frontier.has(edge.target)) {
        next.add(edge.source);
        keep.add(edge.source);
      }
    }
    frontier = next;
    if (keep.size >= cap) break;
  }
  return new Set([...keep].slice(0, cap));
}

function limitedWithSelected<T extends { id: string }>(
  pool: T[],
  cap: number,
  selectedId: string | null,
): T[] {
  const first = pool.slice(0, cap);
  if (!selectedId || first.some((item) => item.id === selectedId)) return first;
  const selected = pool.find((item) => item.id === selectedId);
  if (!selected) return first;
  return [...first.slice(0, Math.max(0, cap - 1)), selected];
}

export function buildEntityExplorationGraph(
  explorer: OmniaCandidateExplorer,
  entityId: string,
  selectedCandidateId: string | null,
  options: { guided: boolean; extraHop: boolean },
): PresentationGraph {
  const entry = explorer.entityIndex.get(entityId);
  const selected = selectedCandidateId ? explorer.candidateIndex.get(selectedCandidateId) : null;

  const nodeIds = new Set<string>([entityId]);
  const hops = options.guided ? 1 : options.extraHop ? 2 : 1;
  const cap = options.guided ? 24 : 38;
  for (const id of collectNeighbours(entityId, explorer.knownEdges, hops, cap)) nodeIds.add(id);

  const candidateCap = options.guided ? GUIDED_EDGE_CAP : EXPLORE_EDGE_CAP;
  const candidatePool = entry?.candidateTriples ?? [];
  const candidates = limitedWithSelected(candidatePool, candidateCap, selectedCandidateId);
  for (const c of candidates) {
    nodeIds.add(c.head);
    nodeIds.add(c.tail);
  }
  if (selected) {
    nodeIds.add(selected.head);
    nodeIds.add(selected.tail);
  }

  const highlightIds = new Set<string>([entityId]);
  if (selected) {
    highlightIds.add(selected.head);
    highlightIds.add(selected.tail);
  }

  const nodes = radialPlace(entityId, nodeIds, explorer.labels, true, highlightIds);
  const edges: PGraphEdge[] = [];

  const knownCandidates: PGraphEdge[] = [];
  for (const edge of explorer.knownEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (edge.source !== entityId && edge.target !== entityId && options.guided) {
      const touchesCandidate = candidates.some(
        (c) =>
          edge.source === c.head ||
          edge.target === c.tail ||
          edge.source === c.tail ||
          edge.target === c.head,
      );
      if (!touchesCandidate) continue;
    }
    knownCandidates.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: "",
      kind: "known",
    });
  }
  const knownCap = options.guided ? GUIDED_EDGE_CAP : EXPLORE_EDGE_CAP;
  edges.push(...knownCandidates.slice(0, knownCap));

  for (const c of candidates) {
    if (!nodeIds.has(c.head) || !nodeIds.has(c.tail)) continue;
    const isSelected = selectedCandidateId === c.id;
    edges.push({
      id: `proposed-${c.id}`,
      source: c.head,
      target: c.tail,
      label: isSelected ? formatRelationLabel(c.relation) : "",
      kind: "proposed",
      highlight: isSelected,
    });
  }

  return {
    width: W,
    height: H,
    nodes,
    edges,
    caption: `Selected entity: ${formatEntityLabel(entityId, explorer.labels.get(entityId))}`,
    overflow: {
      knownMore: Math.max(0, knownCandidates.length - knownCap),
      candidateMore: Math.max(0, candidatePool.length - candidates.length),
    },
  };
}

export function buildRelationExplorationGraph(
  explorer: OmniaCandidateExplorer,
  relationId: string,
  selectedCandidateId: string | null,
  options: { guided: boolean },
): PresentationGraph {
  const entry = explorer.relationIndex.get(relationId);
  const candidateCap = options.guided ? GUIDED_EDGE_CAP : EXPLORE_EDGE_CAP;
  const candidatePool = (entry?.candidateTriples ?? [])
    .filter((c) => explorer.demoNodeIds.has(c.head) || explorer.demoNodeIds.has(c.tail))
  const candidates = limitedWithSelected(candidatePool, candidateCap, selectedCandidateId);

  const nodeIds = new Set<string>();
  for (const c of candidates) {
    nodeIds.add(c.head);
    nodeIds.add(c.tail);
  }
  const knownCap = options.guided ? GUIDED_EDGE_CAP : EXPLORE_EDGE_CAP;
  const knownPool = entry?.knownTriples ?? [];
  for (const t of knownPool.slice(0, knownCap)) {
    if (explorer.demoNodeIds.has(t.head) || explorer.demoNodeIds.has(t.tail)) {
      nodeIds.add(t.head);
      nodeIds.add(t.tail);
    }
  }

  const selected = selectedCandidateId ? explorer.candidateIndex.get(selectedCandidateId) : null;
  const centerId = selected?.head ?? candidates[0]?.head ?? [...nodeIds][0];
  if (!centerId) return { width: W, height: H, nodes: [], edges: [] };

  const highlightIds = new Set<string>();
  if (selected) {
    highlightIds.add(selected.head);
    highlightIds.add(selected.tail);
  }

  const nodes = radialPlace(centerId, nodeIds, explorer.labels, false, highlightIds);
  const edges: PGraphEdge[] = [];

  for (const t of knownPool.slice(0, knownCap)) {
    if (!nodeIds.has(t.head) || !nodeIds.has(t.tail)) continue;
    edges.push({
      id: `known-${t.id}`,
      source: t.head,
      target: t.tail,
      label: "",
      kind: "known",
    });
  }

  for (const c of candidates) {
    const isSelected = selectedCandidateId === c.id;
    edges.push({
      id: `proposed-${c.id}`,
      source: c.head,
      target: c.tail,
      label: isSelected ? formatRelationLabel(c.relation) : "",
      kind: "proposed",
      highlight: isSelected,
    });
  }

  return {
    width: W,
    height: H,
    nodes,
    edges,
    caption: `Relation: ${formatRelationLabel(relationId)}`,
    overflow: {
      knownMore: Math.max(0, knownPool.length - knownCap),
      candidateMore: Math.max(0, candidatePool.length - candidates.length),
    },
  };
}

