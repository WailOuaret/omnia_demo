// Loads full OMNIA 100-node exports and builds entity / relation / candidate indexes
// for interactive Candidate Generation exploration.

import { formatEntityLabel, formatRelationLabel } from "./formatKgLabel";
import {
  loadDemoScenarioRaw,
  type PresentationCandidate,
  type PresentationDatasetId,
} from "./omniaPresentationData";

export type CandidateExploreBy = "entity" | "relation";

export interface ExplorerTriple {
  id: string;
  head: string;
  relation: string;
  tail: string;
  isCandidate: boolean;
  distance: number | null;
  threshold: number | null;
  filterStatus: string;
  llmDecision: string | null;
  llmScore: number | null;
  llmRationale: string | null;
  whyGenerated: string | null;
  sharedRelation: string | null;
  sharedTail: string | null;
}

export interface EntityIndexEntry {
  id: string;
  label: string;
  knownTriples: ExplorerTriple[];
  candidateTriples: ExplorerTriple[];
  candidateCount: number;
}

export interface RelationIndexEntry {
  id: string;
  label: string;
  knownTriples: ExplorerTriple[];
  candidateTriples: ExplorerTriple[];
  candidateCount: number;
}

export interface KnownEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface OmniaCandidateExplorer {
  datasetId: PresentationDatasetId;
  entityIndex: Map<string, EntityIndexEntry>;
  relationIndex: Map<string, RelationIndexEntry>;
  candidateIndex: Map<string, ExplorerTriple>;
  topEntities: EntityIndexEntry[];
  topRelations: RelationIndexEntry[];
  sliceCandidates: ExplorerTriple[];
  labels: Map<string, string>;
  knownEdges: KnownEdge[];
  demoNodeIds: Set<string>;
  metrics: { generatedCandidates: number | null };
}

const loadCache = new Map<PresentationDatasetId, Promise<OmniaCandidateExplorer>>();

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function splitClusterKey(value: unknown): { relation: string | null; tail: string | null } {
  const raw = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  if (!raw.includes(" -> ")) return { relation: null, tail: null };
  const [relation, tail] = raw.split(" -> ", 2);
  return { relation: relation.trim() || null, tail: tail.trim() || null };
}

function parseTriple(raw: Record<string, unknown>, isCandidate: boolean): ExplorerTriple | null {
  const head = String(raw.Head ?? raw.head ?? "");
  const relation = String(raw.Relation ?? raw.relation ?? "");
  const tail = String(raw.Tail ?? raw.tail ?? "");
  if (!head || !relation || !tail) return null;
  const id = String(raw.candidate_id ?? raw.id ?? `${head}|${relation}|${tail}`);
  const shared = splitClusterKey(raw.cluster_keys);
  return {
    id,
    head,
    relation,
    tail,
    isCandidate,
    distance: toNum(raw.distance),
    threshold: toNum(raw.threshold),
    filterStatus: String(raw.filter_status ?? raw.status_bucket ?? raw.status ?? ""),
    llmDecision: raw.llm_decision != null ? String(raw.llm_decision) : null,
    llmScore: toNum(raw.llm_score),
    llmRationale: raw.llm_rationale != null ? String(raw.llm_rationale) : null,
    whyGenerated: raw.why_generated != null ? String(raw.why_generated) : raw.rationale != null ? String(raw.rationale) : null,
    sharedRelation: shared.relation,
    sharedTail: shared.tail,
  };
}

function collectCandidates(raw: Record<string, unknown>): ExplorerTriple[] {
  const out: ExplorerTriple[] = [];
  const seen = new Set<string>();
  const push = (t: ExplorerTriple | null, isCandidate: boolean) => {
    if (!t) return;
    const key = `${t.head}|${t.relation}|${t.tail}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...t, isCandidate });
  };

  const gen = raw.candidateGeneration as { candidates?: unknown[] } | undefined;
  for (const row of gen?.candidates ?? []) {
    if (row && typeof row === "object") push(parseTriple(row as Record<string, unknown>, true), true);
  }
  for (const row of (raw.candidates as unknown[]) ?? []) {
    if (row && typeof row === "object") push(parseTriple(row as Record<string, unknown>, true), true);
  }
  for (const row of (raw.generatedCandidates as unknown[]) ?? []) {
    if (row && typeof row === "object") push(parseTriple(row as Record<string, unknown>, true), true);
  }
  return out;
}

function collectKnownEdges(raw: Record<string, unknown>): KnownEdge[] {
  const edges: KnownEdge[] = [];
  const seen = new Set<string>();
  const slices = [raw.overviewSlice, raw.guidedSlice] as Array<{ edges?: unknown[] } | undefined>;
  for (const slice of slices) {
    for (const e of slice?.edges ?? []) {
      if (!e || typeof e !== "object") continue;
      const edge = e as Record<string, unknown>;
      const source = String(edge.source ?? "");
      const target = String(edge.target ?? "");
      const relation = String(edge.label ?? edge.relation ?? "");
      if (!source || !target) continue;
      const id = String(edge.id ?? `${source}|${relation}|${target}`);
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push({ id, source, target, relation });
    }
  }
  return edges;
}

function collectLabels(raw: Record<string, unknown>): Map<string, string> {
  const labels = new Map<string, string>();
  const slices = [raw.overviewSlice, raw.guidedSlice] as Array<{ nodes?: unknown[] } | undefined>;
  for (const slice of slices) {
    for (const n of slice?.nodes ?? []) {
      if (!n || typeof n !== "object") continue;
      const node = n as Record<string, unknown>;
      const id = String(node.id ?? "");
      const label = String(node.label ?? id);
      if (id) labels.set(id, label);
    }
  }
  return labels;
}

function demoNodeIdsFrom(raw: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  for (const slice of [raw.overviewSlice, raw.guidedSlice] as Array<{ nodes?: unknown[] } | undefined>) {
    for (const n of slice?.nodes ?? []) {
      if (n && typeof n === "object" && (n as Record<string, unknown>).id) {
        ids.add(String((n as Record<string, unknown>).id));
      }
    }
  }
  return ids;
}

function ensureEntity(index: Map<string, EntityIndexEntry>, id: string, label: string): EntityIndexEntry {
  let entry = index.get(id);
  if (!entry) {
    entry = { id, label, knownTriples: [], candidateTriples: [], candidateCount: 0 };
    index.set(id, entry);
  }
  return entry;
}

function ensureRelation(index: Map<string, RelationIndexEntry>, id: string, label: string): RelationIndexEntry {
  let entry = index.get(id);
  if (!entry) {
    entry = { id, label, knownTriples: [], candidateTriples: [], candidateCount: 0 };
    index.set(id, entry);
  }
  return entry;
}

function tripleKey(t: ExplorerTriple): string {
  return `${t.head}|${t.relation}|${t.tail}`;
}

export function buildOmniaCandidateExplorer(
  datasetId: PresentationDatasetId,
  raw: Record<string, unknown>,
): OmniaCandidateExplorer {
  const labels = collectLabels(raw);
  const knownEdges = collectKnownEdges(raw);
  const demoNodeIds = demoNodeIdsFrom(raw);
  const allCandidates = collectCandidates(raw);

  const entityIndex = new Map<string, EntityIndexEntry>();
  const relationIndex = new Map<string, RelationIndexEntry>();
  const candidateIndex = new Map<string, ExplorerTriple>();

  const addKnownToEntity = (entityId: string, triple: ExplorerTriple) => {
    const entry = ensureEntity(entityIndex, entityId, formatEntityLabel(entityId, labels.get(entityId)));
    if (!entry.knownTriples.some((t) => tripleKey(t) === tripleKey(triple))) {
      entry.knownTriples.push(triple);
    }
  };

  const addKnownToRelation = (relationId: string, triple: ExplorerTriple) => {
    const entry = ensureRelation(
      relationIndex,
      relationId,
      formatRelationLabel(relationId),
    );
    if (!entry.knownTriples.some((t) => tripleKey(t) === tripleKey(triple))) {
      entry.knownTriples.push(triple);
    }
  };

  for (const edge of knownEdges) {
    const triple: ExplorerTriple = {
      id: edge.id,
      head: edge.source,
      relation: edge.relation,
      tail: edge.target,
      isCandidate: false,
      distance: null,
      threshold: null,
      filterStatus: "",
      llmDecision: null,
      llmScore: null,
      llmRationale: null,
      whyGenerated: null,
      sharedRelation: null,
      sharedTail: null,
    };
    addKnownToEntity(edge.source, triple);
    addKnownToEntity(edge.target, triple);
    addKnownToRelation(edge.relation, triple);
  }

  for (const cand of allCandidates) {
    candidateIndex.set(cand.id, cand);
    for (const entityId of [cand.head, cand.tail]) {
      const entry = ensureEntity(entityIndex, entityId, formatEntityLabel(entityId, labels.get(entityId)));
      if (!entry.candidateTriples.some((t) => t.id === cand.id)) {
        entry.candidateTriples.push(cand);
        entry.candidateCount = entry.candidateTriples.length;
      }
    }
    const relEntry = ensureRelation(relationIndex, cand.relation, formatRelationLabel(cand.relation));
    if (!relEntry.candidateTriples.some((t) => t.id === cand.id)) {
      relEntry.candidateTriples.push(cand);
      relEntry.candidateCount = relEntry.candidateTriples.length;
    }
  }

  const sliceCandidates = allCandidates.filter(
    (c) => demoNodeIds.has(c.head) || demoNodeIds.has(c.tail),
  );

  const topEntities = [...entityIndex.values()]
    .filter(
      (e) =>
        e.candidateCount > 0 &&
        (demoNodeIds.has(e.id) ||
          e.candidateTriples.some((t) => demoNodeIds.has(t.head) || demoNodeIds.has(t.tail))),
    )
    .sort((a, b) => b.candidateCount - a.candidateCount)
    .slice(0, 30);

  const topRelations = [...relationIndex.values()]
    .filter((r) => r.candidateCount > 0)
    .sort((a, b) => b.candidateCount - a.candidateCount)
    .slice(0, 20);

  const genSummary = raw.candidateGeneration as
    | { summary?: { generated_count?: number; generated_candidates?: number } }
    | undefined;
  const generatedCandidates =
    genSummary?.summary?.generated_count ??
    genSummary?.summary?.generated_candidates ??
    (raw.generatedCandidates as unknown[] | undefined)?.length ??
    allCandidates.length;

  return {
    datasetId,
    entityIndex,
    relationIndex,
    candidateIndex,
    topEntities,
    topRelations,
    sliceCandidates,
    labels,
    knownEdges,
    demoNodeIds,
    metrics: { generatedCandidates: generatedCandidates ?? null },
  };
}

export function loadOmniaCandidateExplorer(datasetId: PresentationDatasetId): Promise<OmniaCandidateExplorer> {
  const cached = loadCache.get(datasetId);
  if (cached) return cached;

  const promise = loadDemoScenarioRaw(datasetId).then((raw) => buildOmniaCandidateExplorer(datasetId, raw));

  loadCache.set(datasetId, promise);
  return promise;
}

export function explorerTripleToPresentation(t: ExplorerTriple): PresentationCandidate {
  return {
    id: t.id,
    head: t.head,
    relation: t.relation,
    tail: t.tail,
    distance: t.distance,
    threshold: t.threshold,
    filterStatus: t.filterStatus,
    llmDecision: t.llmDecision,
    llmScore: t.llmScore,
    llmRationale: t.llmRationale,
    retrievedContext: [],
    clusterId: null,
    whyGenerated: t.whyGenerated,
    sharedRelation: t.sharedRelation,
    sharedTail: t.sharedTail,
  };
}

export function resolvePresentationCandidate(
  scenarioCandidates: PresentationCandidate[],
  explorer: OmniaCandidateExplorer | null,
  candidateId: string | null,
): PresentationCandidate | null {
  if (!candidateId) return null;
  const fromScenario = scenarioCandidates.find((c) => c.id === candidateId);
  if (fromScenario) return fromScenario;
  const fromExplorer = explorer?.candidateIndex.get(candidateId);
  return fromExplorer ? explorerTripleToPresentation(fromExplorer) : null;
}

export function filterCandidatesForExplore(
  explorer: OmniaCandidateExplorer,
  exploreBy: CandidateExploreBy,
  entityId: string | null,
  relationId: string | null,
): ExplorerTriple[] {
  if (exploreBy === "entity" && entityId) {
    return (explorer.entityIndex.get(entityId)?.candidateTriples ?? []).slice(0, 50);
  }
  if (exploreBy === "relation" && relationId) {
    return (explorer.relationIndex.get(relationId)?.candidateTriples ?? []).slice(0, 50);
  }
  return [];
}

export function pickDefaultExploreEntity(explorer: OmniaCandidateExplorer): EntityIndexEntry | null {
  const fromTop = explorer.topEntities.find((e) => e.candidateCount > 0);
  if (fromTop) return fromTop;
  for (const entry of explorer.entityIndex.values()) {
    if (entry.candidateCount > 0) return entry;
  }
  return null;
}

export function pickDefaultExploreRelation(explorer: OmniaCandidateExplorer): RelationIndexEntry | null {
  const fromTop = explorer.topRelations.find((r) => r.candidateCount > 0);
  if (fromTop) return fromTop;
  for (const entry of explorer.relationIndex.values()) {
    if (entry.candidateCount > 0) return entry;
  }
  return null;
}

export function searchEntities(explorer: OmniaCandidateExplorer, query: string, limit = 12): EntityIndexEntry[] {
  const q = query.trim().toLowerCase();
  const pool = explorer.topEntities;
  if (!q) return pool.slice(0, limit);
  return pool
    .filter((e) => {
      const label = e.label.toLowerCase();
      return label.includes(q) || e.id.toLowerCase().includes(q);
    })
    .slice(0, limit);
}

export function searchRelations(explorer: OmniaCandidateExplorer, query: string, limit = 12): RelationIndexEntry[] {
  const q = query.trim().toLowerCase();
  const pool = explorer.topRelations;
  if (!q) return pool.slice(0, limit);
  return pool
    .filter((r) => {
      const label = r.label.toLowerCase();
      return label.includes(q) || r.id.toLowerCase().includes(q);
    })
    .slice(0, limit);
}
