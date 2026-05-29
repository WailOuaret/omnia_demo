// Loads the compact OMNIA+ presentation scenarios produced by
// scripts/build_presentation_data.py (served from /omnia-presentation/*.json)
// and exposes the static paper facts that belong in details / "About" panels.

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

// Dataset facts from the OMNIA paper (Section 5 / Table). Shown only in details.
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
    label: "COVID-Fact",
    relations: 28,
    entities: 1416,
    triples: 908,
    source: "COVID-19 literature extraction",
    notes: "Motivating example only; too small for the main evaluation. Static demo in this app.",
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

// OMNIA paper headline results — for the optional "About OMNIA results" panel.
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
    "Too many retrieved triples can hurt accuracy by adding irrelevant context.",
  ],
};

const cache = new Map<PresentationDatasetId, Promise<PresentationScenario>>();

export function loadPresentationScenario(
  datasetId: PresentationDatasetId,
): Promise<PresentationScenario> {
  const cached = cache.get(datasetId);
  if (cached) return cached;
  const url = `${import.meta.env.BASE_URL}omnia-presentation/${datasetId}.json`;
  const promise = fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`Could not load presentation data for ${datasetId} (${res.status})`);
    }
    return res.json() as Promise<PresentationScenario>;
  });
  cache.set(datasetId, promise);
  return promise;
}

export function factsFor(datasetId: PresentationDatasetId): DatasetFacts | undefined {
  return DATASET_FACTS.find((f) => f.id === datasetId);
}
