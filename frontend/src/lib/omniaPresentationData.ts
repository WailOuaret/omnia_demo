// Loads the exported OMNIA+ demo scenarios from /demo-scenarios/*.json and
// adapts them into the compact view model used by the presentation screens.

export type PresentationDatasetId = "codexM" | "fb15k237" | "wn18rr" | "covidFact";

export interface PresentationNode {
  id: string;
  label: string;
}

export interface PresentationEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  status: string;
}

export interface PresentationGuidedNode extends PresentationNode {
  role: string;
  clusterId: string | null;
}

export interface PresentationGuidedEdge extends PresentationEdge {
  candidateId: string | null;
  role: string;
}

export interface PresentationCandidate {
  id: string;
  head: string;
  relation: string;
  tail: string;
  distance: number | null;
  threshold: number | null;
  filterStatus: string;
  llmDecision: string | null;
  llmScore: number | null;
  llmRationale: string | null;
  retrievedContext: string[];
  clusterId: string | null;
  whyGenerated: string | null;
  sharedRelation: string | null;
  sharedTail: string | null;
}

export interface PresentationScenario {
  datasetId: PresentationDatasetId;
  label: string;
  shortName: string;
  recommendedMode: "sentence-rag" | "triple-rag";
  publicStatus: "public" | "private";
  static: boolean;
  paperStats: { entities?: number; relations?: number; triples?: number };
  sample: {
    knownTriples: number | null;
    missingTriples: number | null;
    rowCount: number | null;
    sampleProportion: number | null;
  };
  metrics: {
    generatedCandidates: number | null;
    filterQueueCount: number | null;
    filteringEnabled: boolean | null;
    filteringModel: string | null;
    threshold: number | null;
    filteringAccepted: number | null;
    filteringRejected: number | null;
    llmAvailable: boolean;
    llmStrategyLabel: string | null;
    llmTopK: number | null;
    llmAccepted: number | null;
    llmRejected: number | null;
    llmUnresolved: number | null;
  };
  cluster: {
    sharedRelation: string | null;
    sharedTail: string | null;
    members: string[];
    clusterKey: string | null;
  };
  overview: { nodes: PresentationNode[]; edges: PresentationEdge[] };
  guided: { nodes: PresentationGuidedNode[]; edges: PresentationGuidedEdge[] };
  candidates: PresentationCandidate[];
  selectedCandidateId: string | null;
}

export const PRESENTATION_DATASET_ORDER: PresentationDatasetId[] = [
  "codexM",
  "fb15k237",
  "wn18rr",
  "covidFact",
];

const RESULT_FILES: Record<PresentationDatasetId, string> = {
  codexM: "codexM_100node.json",
  fb15k237: "fb15k237_100node.json",
  wn18rr: "wn18rr_100node.json",
  covidFact: "covidFact_static_demo.json",
};

const DATASET_META: Record<
  PresentationDatasetId,
  { label: string; shortName: string; publicStatus: "public" | "private"; static: boolean }
> = {
  codexM: { label: "CoDEx-M", shortName: "CoDEx-M", publicStatus: "public", static: false },
  fb15k237: { label: "FB15K-237", shortName: "FB15K-237", publicStatus: "public", static: false },
  wn18rr: { label: "WN18RR", shortName: "WN18RR", publicStatus: "public", static: false },
  covidFact: {
    label: "COVID-Fact static",
    shortName: "COVID-Fact static",
    publicStatus: "public",
    static: true,
  },
};

// Dataset facts from the OMNIA paper, kept for compact dataset cards only.
export interface DatasetFacts {
  id: PresentationDatasetId | "socioEconomic";
  label: string;
  relations: number;
  entities: number;
  triples: number;
  source: string;
  notes: string;
  bestF1?: number;
  publicStatus: "public" | "private";
}

export const DATASET_FACTS: DatasetFacts[] = [
  {
    id: "codexM",
    label: "CoDEx-M",
    relations: 49,
    entities: 16759,
    triples: 60000,
    source: "Derived from Wikidata",
    notes: "Natural names for entities and relations; suited for language-grounded completion.",
    bestF1: 0.91,
    publicStatus: "public",
  },
  {
    id: "fb15k237",
    label: "FB15K-237",
    relations: 29,
    entities: 12993,
    triples: 59270,
    source: "Refined Freebase subset",
    notes: "Removes inverse-relation leakage present in FB15K.",
    bestF1: 0.86,
    publicStatus: "public",
  },
  {
    id: "wn18rr",
    label: "WN18RR",
    relations: 11,
    entities: 40943,
    triples: 93003,
    source: "WordNet-based",
    notes: "Improved WN18; lexical synset IDs are hard to turn into natural sentences.",
    bestF1: 0.87,
    publicStatus: "public",
  },
  {
    id: "covidFact",
    label: "COVID-Fact static",
    relations: 28,
    entities: 1416,
    triples: 908,
    source: "COVID-19 literature extraction",
    notes: "Static prepared sample for the demo.",
    publicStatus: "public",
  },
  {
    id: "socioEconomic",
    label: "Socio-Economic",
    relations: 17175,
    entities: 33563,
    triples: 64417,
    source: "Sparse KG generated using LLMs (private)",
    notes: "Useful to illustrate sparsity limitations of structural candidate generation.",
    publicStatus: "private",
  },
];

export const OMNIA_PAPER_RESULTS = {
  ragF1: [
    { dataset: "CoDEx-M", f1: 0.91 },
    { dataset: "WN18RR", f1: 0.87 },
    { dataset: "FB15K-237", f1: 0.86 },
  ],
  baselines: ["TransE", "DistMult", "ComplEx", "RotatE", "KG-BERT", "MuKDC"],
  notes: [
    "OMNIA improves F1 by up to 23 percentage points on some benchmarks.",
    "RAG is generally the strongest LLM validation strategy.",
    "A retrieval depth of top-k between 2 and 4 works best.",
  ],
};

const CANDIDATE_CAP = 14;
const scenarioCache = new Map<PresentationDatasetId, Promise<PresentationScenario>>();
const rawCache = new Map<PresentationDatasetId, Promise<Record<string, unknown>>>();
let indexCache: Promise<unknown> | null = null;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const out = String(value).trim();
  return out ? out : null;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function splitClusterKey(key: string | null): { relation: string | null; tail: string | null } {
  if (!key) return { relation: null, tail: null };
  if (!key.includes(" -> ")) return { relation: null, tail: null };
  const [relation, tail] = key.split(" -> ", 2);
  return { relation: relation.trim() || null, tail: tail.trim() || null };
}

function firstClusterKey(raw: Record<string, unknown>): string | null {
  return text(asArray(raw.cluster_keys)[0]);
}

function firstClusterId(raw: Record<string, unknown>): string | null {
  return text(asArray(raw.cluster_ids)[0]);
}

function candidateId(raw: Record<string, unknown>): string {
  const head = text(raw.Head ?? raw.head) ?? "";
  const relation = text(raw.Relation ?? raw.relation) ?? "";
  const tail = text(raw.Tail ?? raw.tail) ?? "";
  return text(raw.candidate_id ?? raw.id) ?? `${head}|${relation}|${tail}`;
}

function toCandidate(
  value: unknown,
  sharedRelation: string | null,
  sharedTail: string | null,
): PresentationCandidate | null {
  const raw = asRecord(value);
  const head = text(raw.Head ?? raw.head);
  const relation = text(raw.Relation ?? raw.relation);
  const tail = text(raw.Tail ?? raw.tail);
  if (!head || !relation || !tail) return null;

  const clusterFallback = splitClusterKey(firstClusterKey(raw));
  const retrievedContext = asArray(raw.retrieved_context ?? raw.retrievedContext)
    .map((entry) => text(entry))
    .filter((entry): entry is string => Boolean(entry));

  return {
    id: candidateId(raw),
    head,
    relation,
    tail,
    distance: num(raw.distance),
    threshold: num(raw.threshold),
    filterStatus: text(raw.filter_status ?? raw.status_bucket ?? raw.status) ?? "",
    llmDecision: text(raw.llm_decision ?? raw.llmDecision),
    llmScore: num(raw.llm_score ?? raw.llmScore),
    llmRationale: text(raw.llm_rationale ?? raw.llmRationale ?? raw.rationale),
    retrievedContext,
    clusterId: firstClusterId(raw),
    whyGenerated: text(raw.why_generated ?? raw.whyGenerated ?? raw.rationale),
    sharedRelation: sharedRelation ?? clusterFallback.relation,
    sharedTail: sharedTail ?? clusterFallback.tail,
  };
}

function addCandidate(
  candidates: PresentationCandidate[],
  seen: Set<string>,
  candidate: PresentationCandidate | null,
  mode: "append" | "prepend" = "append",
) {
  if (!candidate || !candidate.id || seen.has(candidate.id)) return;
  seen.add(candidate.id);
  if (mode === "prepend") candidates.unshift(candidate);
  else candidates.push(candidate);
}

function overviewFrom(sliceValue: unknown): PresentationScenario["overview"] {
  const slice = asRecord(sliceValue);
  const rawNodes = asArray(slice.nodes);
  const labelById = new Map<string, string>();
  for (const nodeValue of rawNodes) {
    const node = asRecord(nodeValue);
    const id = text(node.id);
    if (id) labelById.set(id, text(node.label) ?? id);
  }

  const edges: PresentationEdge[] = [];
  const nodeIds = new Set<string>();
  for (const edgeValue of asArray(slice.edges)) {
    const edge = asRecord(edgeValue);
    const source = text(edge.source);
    const target = text(edge.target);
    if (!source || !target) continue;
    const relation = text(edge.label ?? edge.relation) ?? "";
    edges.push({
      id: text(edge.id) ?? `${source}|${relation}|${target}`,
      source,
      target,
      relation,
      status: text(edge.status) ?? "known",
    });
    nodeIds.add(source);
    nodeIds.add(target);
  }

  for (const id of labelById.keys()) nodeIds.add(id);
  const nodes = [...nodeIds].map((id) => ({ id, label: labelById.get(id) ?? id }));
  return { nodes, edges };
}

function guidedFrom(sliceValue: unknown): PresentationScenario["guided"] {
  const slice = asRecord(sliceValue);
  const nodes: PresentationGuidedNode[] = asArray(slice.nodes)
    .map((nodeValue) => {
      const node = asRecord(nodeValue);
      const id = text(node.id);
      if (!id) return null;
      return {
        id,
        label: text(node.label) ?? id,
        role: text(node.role) ?? "context",
        clusterId: text(node.cluster_id ?? node.clusterId),
      };
    })
    .filter((node): node is PresentationGuidedNode => Boolean(node));

  const keepIds = new Set(nodes.map((node) => node.id));
  const edges: PresentationGuidedEdge[] = [];
  for (const edgeValue of asArray(slice.edges)) {
    const edge = asRecord(edgeValue);
    const source = text(edge.source);
    const target = text(edge.target);
    if (!source || !target || !keepIds.has(source) || !keepIds.has(target)) continue;
    const relation = text(edge.label ?? edge.relation) ?? "";
    edges.push({
      id: text(edge.id) ?? `${source}|${relation}|${target}`,
      source,
      target,
      relation,
      status: text(edge.status) ?? "known",
      candidateId: text(edge.candidate_id ?? edge.candidateId),
      role: text(edge.role) ?? "context",
    });
  }
  return { nodes, edges };
}

function paperStatsFrom(value: unknown): PresentationScenario["paperStats"] {
  const raw = asRecord(value);
  return {
    entities: num(raw.entities) ?? undefined,
    relations: num(raw.relations) ?? undefined,
    triples: num(raw.triples) ?? undefined,
  };
}

function buildCandidateList(raw: Record<string, unknown>, sharedRelation: string | null, sharedTail: string | null) {
  const candidates: PresentationCandidate[] = [];
  const seen = new Set<string>();
  const guidedSlice = asRecord(raw.guidedSlice);
  const candidateGeneration = asRecord(raw.candidateGeneration);
  const filtering = asRecord(raw.filtering);

  const selectedRaw = raw.selectedCandidate ?? guidedSlice.selected_candidate;
  addCandidate(candidates, seen, toCandidate(selectedRaw, sharedRelation, sharedTail), "prepend");

  for (const row of asArray(guidedSlice.candidates).concat(asArray(raw.candidates))) {
    if (candidates.length >= CANDIDATE_CAP) break;
    addCandidate(candidates, seen, toCandidate(row, sharedRelation, sharedTail));
  }

  const threshold = num(filtering.threshold);
  const accepted = asArray(filtering.candidates)
    .map((row) => toCandidate(row, sharedRelation, sharedTail))
    .filter((candidate): candidate is PresentationCandidate => Boolean(candidate))
    .filter((candidate) => {
      if (candidate.distance == null || threshold == null) return false;
      return candidate.distance <= threshold;
    })
    .sort((a, b) => (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER));
  for (const candidate of accepted) {
    if (candidates.length >= CANDIDATE_CAP) break;
    addCandidate(candidates, seen, candidate);
  }

  for (const row of asArray(candidateGeneration.candidates)) {
    if (candidates.length >= CANDIDATE_CAP) break;
    addCandidate(candidates, seen, toCandidate(row, sharedRelation, sharedTail));
  }

  return candidates;
}

function buildBackendScenario(datasetId: PresentationDatasetId, raw: Record<string, unknown>): PresentationScenario {
  const meta = DATASET_META[datasetId];
  const guidedSlice = asRecord(raw.guidedSlice);
  const selectedCluster = asRecord(guidedSlice.selected_cluster ?? raw.selectedCluster);
  const sharedRelation = text(selectedCluster.shared_relation ?? selectedCluster.sharedRelation);
  const sharedTail = text(selectedCluster.shared_tail ?? selectedCluster.sharedTail);
  const candidateGeneration = asRecord(raw.candidateGeneration);
  const candidateSummary = asRecord(candidateGeneration.summary);
  const filtering = asRecord(raw.filtering);
  const llm = asRecord(raw.llmValidation);
  const llmSummary = asRecord(llm.summary);
  const session = asRecord(raw.session);
  const diagnostics = asRecord(session.diagnostics);
  const candidates = buildCandidateList(raw, sharedRelation, sharedTail);

  const selectedCandidate = toCandidate(raw.selectedCandidate ?? guidedSlice.selected_candidate, sharedRelation, sharedTail);
  const selectedCandidateId = selectedCandidate?.id ?? candidates[0]?.id ?? null;

  return {
    datasetId,
    label: meta.label,
    shortName: meta.shortName,
    recommendedMode: text(raw.recommendedMode) === "sentence-rag" ? "sentence-rag" : "triple-rag",
    publicStatus: meta.publicStatus,
    static: meta.static,
    paperStats: paperStatsFrom(raw.paperStats),
    sample: {
      knownTriples: num(session.known_triples),
      missingTriples: num(session.missing_triples),
      rowCount: num(diagnostics.row_count),
      sampleProportion: num(session.sample_proportion),
    },
    metrics: {
      generatedCandidates:
        num(candidateSummary.generated_count) ??
        num(candidateSummary.generated_candidates) ??
        (asArray(candidateGeneration.candidates).length || null),
      filterQueueCount: num(candidateSummary.filter_queue_count),
      filteringEnabled: boolOrNull(filtering.enabled),
      filteringModel: text(asRecord(filtering.metadata).model_name) ?? "TransE",
      threshold: num(filtering.threshold),
      filteringAccepted: num(filtering.accepted_count),
      filteringRejected: num(filtering.rejected_count),
      llmAvailable: Object.keys(llm).length > 0 && llm.is_mock !== true,
      llmStrategyLabel: text(llm.strategy_label),
      llmTopK: num(llm.top_k),
      llmAccepted: num(llmSummary.accepted),
      llmRejected: num(llmSummary.rejected),
      llmUnresolved: num(llmSummary.unresolved),
    },
    cluster: {
      sharedRelation,
      sharedTail,
      members: asArray(selectedCluster.members).map((member) => String(member)),
      clusterKey: text(selectedCluster.cluster_key),
    },
    overview: overviewFrom(raw.overviewSlice),
    guided: guidedFrom(raw.guidedSlice),
    candidates,
    selectedCandidateId,
  };
}

function buildCovidScenario(raw: Record<string, unknown>): PresentationScenario {
  const meta = DATASET_META.covidFact;
  const selectedCluster = asRecord(raw.selectedCluster);
  const sharedRelation = text(selectedCluster.shared_relation ?? selectedCluster.sharedRelation);
  const sharedTail = text(selectedCluster.shared_tail ?? selectedCluster.sharedTail);
  const filtering = asRecord(raw.filtering);
  const llm = asRecord(raw.llm);
  const candidates: PresentationCandidate[] = [];
  const seen = new Set<string>();

  addCandidate(candidates, seen, toCandidate(raw.selectedCandidate, sharedRelation, sharedTail), "prepend");
  for (const row of asArray(raw.generatedCandidates)) {
    addCandidate(candidates, seen, toCandidate(row, sharedRelation, sharedTail));
  }

  const generatedCount = asArray(raw.generatedCandidates).length || null;
  const accepted = num(filtering.afterFiltering);
  const before = num(filtering.beforeFiltering);

  return {
    datasetId: "covidFact",
    label: meta.label,
    shortName: meta.shortName,
    recommendedMode: text(raw.recommendedMode) === "triple-rag" ? "triple-rag" : "sentence-rag",
    publicStatus: meta.publicStatus,
    static: true,
    paperStats: paperStatsFrom(raw.paperStats),
    sample: {
      knownTriples: num(asRecord(raw.paperStats).triples),
      missingTriples: null,
      rowCount: null,
      sampleProportion: null,
    },
    metrics: {
      generatedCandidates: generatedCount,
      filterQueueCount: before,
      filteringEnabled: boolOrNull(filtering.available),
      filteringModel: text(filtering.model) ?? "TransE",
      threshold: num(filtering.threshold),
      filteringAccepted: accepted,
      filteringRejected: before != null && accepted != null ? before - accepted : null,
      llmAvailable: Boolean(llm.available),
      llmStrategyLabel: text(llm.strategy),
      llmTopK: num(llm.topK),
      llmAccepted: candidates.filter((candidate) => candidate.llmDecision === "valid").length,
      llmRejected: candidates.filter((candidate) => candidate.llmDecision === "invalid").length,
      llmUnresolved: candidates.filter((candidate) => candidate.llmDecision === "uncertain").length,
    },
    cluster: {
      sharedRelation,
      sharedTail,
      members: asArray(selectedCluster.members).map((member) => String(member)),
      clusterKey: text(selectedCluster.cluster_key),
    },
    overview: overviewFrom(raw.overviewSlice),
    guided: guidedFrom(asRecord(asRecord(raw.steps).clustering).graphSlice ?? raw.overviewSlice),
    candidates,
    selectedCandidateId: candidates[0]?.id ?? null,
  };
}

function scenarioFromRaw(datasetId: PresentationDatasetId, raw: Record<string, unknown>): PresentationScenario {
  if (datasetId === "covidFact") return buildCovidScenario(raw);
  return buildBackendScenario(datasetId, raw);
}

export function loadDemoScenarioIndex(): Promise<unknown> {
  if (indexCache) return indexCache;
  const url = `${import.meta.env.BASE_URL}demo-scenarios/index.json`;
  indexCache = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Could not load demo scenario index (${res.status})`);
    return res.json() as Promise<unknown>;
  });
  return indexCache;
}

export function loadDemoScenarioRaw(datasetId: PresentationDatasetId): Promise<Record<string, unknown>> {
  const cached = rawCache.get(datasetId);
  if (cached) return cached;
  const url = `${import.meta.env.BASE_URL}demo-scenarios/${RESULT_FILES[datasetId]}`;
  const promise = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Could not load demo scenario data for ${datasetId} (${res.status})`);
    return res.json() as Promise<Record<string, unknown>>;
  });
  rawCache.set(datasetId, promise);
  return promise;
}

export function loadPresentationScenario(datasetId: PresentationDatasetId): Promise<PresentationScenario> {
  const cached = scenarioCache.get(datasetId);
  if (cached) return cached;
  const promise = loadDemoScenarioRaw(datasetId).then((raw) => scenarioFromRaw(datasetId, raw));
  scenarioCache.set(datasetId, promise);
  return promise;
}

export function factsFor(datasetId: PresentationDatasetId): DatasetFacts | undefined {
  return DATASET_FACTS.find((fact) => fact.id === datasetId);
}
