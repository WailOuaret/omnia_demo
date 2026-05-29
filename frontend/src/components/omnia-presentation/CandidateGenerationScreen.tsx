import { useEffect, useMemo, useState } from "react";
import { InteractiveGraph } from "./InteractiveGraph";
import { GraphInspector } from "./GraphInspector";
import { CandidateTripleCard } from "./CandidateTripleCard";
import { SummaryMetricCards } from "./SummaryMetricCards";
import type { GraphInteraction } from "./screenInteraction";
import {
  buildCandidateFocusGraph,
  buildEntityExplorationGraph,
  buildRelationExplorationGraph,
} from "../../lib/buildCandidateExploreGraph";
import {
  explorerTripleToPresentation,
  filterCandidatesForExplore,
  searchEntities,
  searchRelations,
  type CandidateExploreBy,
  type OmniaCandidateExplorer,
} from "../../lib/omniaCandidateExplorer";
import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

const LIST_PAGE_SIZE = 8;

function fmt(value: number | null | undefined): string {
  return value == null ? "Not included" : value.toLocaleString();
}

export function CandidateGenerationScreen({
  scenario,
  explorer,
  selectedCandidateId,
  onSelectCandidate,
  onContinue,
  gi,
}: {
  scenario: PresentationScenario;
  explorer: OmniaCandidateExplorer | null;
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  onContinue: () => void;
  gi: GraphInteraction;
}) {
  const [generated, setGenerated] = useState(false);
  const [exploreBy, setExploreBy] = useState<CandidateExploreBy>("entity");
  const [entityQuery, setEntityQuery] = useState("");
  const [relationQuery, setRelationQuery] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [extraHop, setExtraHop] = useState(false);
  const [showLimit, setShowLimit] = useState(LIST_PAGE_SIZE);

  useEffect(() => {
    if (!explorer) return;
    setGenerated(false);
    setExploreBy("entity");
    setEntityQuery("");
    setRelationQuery("");
    setCandidateQuery("");
    setSelectedEntityId(explorer.topEntities[0]?.id ?? null);
    setSelectedRelationId(explorer.topRelations[0]?.id ?? null);
    setExtraHop(false);
    setShowLimit(LIST_PAGE_SIZE);
  }, [explorer?.datasetId]);

  const entityOptions = useMemo(
    () => (explorer ? searchEntities(explorer, entityQuery) : []),
    [explorer, entityQuery],
  );

  const relationOptions = useMemo(
    () => (explorer ? searchRelations(explorer, relationQuery) : []),
    [explorer, relationQuery],
  );

  const filteredTriples = useMemo(() => {
    if (!explorer) return [];
    return filterCandidatesForExplore(
      explorer,
      exploreBy,
      selectedEntityId,
      selectedRelationId,
      exploreBy === "candidate" ? candidateQuery : "",
    );
  }, [explorer, exploreBy, selectedEntityId, selectedRelationId, candidateQuery]);

  const listCandidates: PresentationCandidate[] = useMemo(
    () => filteredTriples.map(explorerTripleToPresentation),
    [filteredTriples],
  );

  useEffect(() => {
    setShowLimit(LIST_PAGE_SIZE);
    if (listCandidates.length === 0) return;
    if (!selectedCandidateId || !listCandidates.some((candidate) => candidate.id === selectedCandidateId)) {
      onSelectCandidate(listCandidates[0].id);
    }
  }, [listCandidates, selectedCandidateId, onSelectCandidate]);

  const selectedCandidate = useMemo(() => {
    if (listCandidates.length === 0) return null;
    if (!selectedCandidateId) return listCandidates[0] ?? null;
    return (
      listCandidates.find((candidate) => candidate.id === selectedCandidateId) ??
      (explorer?.candidateIndex.get(selectedCandidateId)
        ? explorerTripleToPresentation(explorer.candidateIndex.get(selectedCandidateId)!)
        : null)
    );
  }, [selectedCandidateId, listCandidates, explorer]);

  const graph = useMemo(() => {
    if (!generated || !explorer) return null;
    if (exploreBy === "entity" && selectedEntityId) {
      return buildEntityExplorationGraph(explorer, selectedEntityId, selectedCandidateId, {
        guided: gi.mode === "guided",
        extraHop: gi.mode === "explore" && extraHop,
      });
    }
    if (exploreBy === "relation" && selectedRelationId) {
      return buildRelationExplorationGraph(explorer, selectedRelationId, selectedCandidateId, {
        guided: gi.mode === "guided",
      });
    }
    if (exploreBy === "candidate" && selectedCandidateId) {
      return buildCandidateFocusGraph(explorer, selectedCandidateId);
    }
    return null;
  }, [generated, explorer, exploreBy, selectedEntityId, selectedRelationId, selectedCandidateId, gi.mode, extraHop]);

  const graphTitle = useMemo(() => {
    if (exploreBy === "entity" && selectedEntityId) {
      return `Selected entity: ${formatEntityLabel(selectedEntityId, explorer?.labels.get(selectedEntityId))}`;
    }
    if (exploreBy === "relation" && selectedRelationId) {
      return `Relation: ${formatRelationLabel(selectedRelationId)}`;
    }
    if (selectedCandidate) {
      return `Selected candidate: ${formatEntityLabel(selectedCandidate.head)} -> ${formatRelationLabel(
        selectedCandidate.relation,
      )} -> ${formatEntityLabel(selectedCandidate.tail)}`;
    }
    return undefined;
  }, [exploreBy, selectedEntityId, selectedRelationId, selectedCandidate, explorer]);

  const generatedCount = explorer?.metrics.generatedCandidates ?? scenario.metrics.generatedCandidates;
  const shownCandidates = listCandidates.slice(0, showLimit);
  const showingEnd = Math.min(showLimit, listCandidates.length);

  return (
    <div className="space-y-4">
      <SummaryMetricCards
        items={[
          { label: "Dataset", value: scenario.shortName },
          { label: "Nodes", value: fmt(scenario.paperStats.entities) },
          { label: "Relations", value: fmt(scenario.paperStats.relations) },
          { label: "Known triples", value: fmt(scenario.sample.knownTriples ?? scenario.paperStats.triples) },
          { label: "Generated candidates", value: fmt(generatedCount), tone: "blue" },
        ]}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Candidate generation</p>
            <p className="mt-1 text-xs text-slate-500">
              Precomputed candidates are ready for this prepared sample.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGenerated(true)}
            disabled={!explorer || generated}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate Candidates
          </button>
        </div>
        {generated ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Candidate generation completed successfully. Total candidates generated: {fmt(generatedCount)}.
          </div>
        ) : null}
      </div>

      {generated ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">Explore candidates by</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["entity", "relation", "candidate"] as CandidateExploreBy[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setExploreBy(mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                    exploreBy === mode
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {exploreBy === "entity" ? (
              <div className="mt-3 space-y-2">
                <input
                  value={entityQuery}
                  onChange={(event) => setEntityQuery(event.target.value)}
                  placeholder="Search entity ID or name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                  {entityOptions.map((entity) => (
                    <button
                      key={entity.id}
                      type="button"
                      onClick={() => {
                        setSelectedEntityId(entity.id);
                        gi.setMode("guided");
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        selectedEntityId === entity.id
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {entity.label}
                      <span className="ml-1 text-slate-400">({entity.candidateCount})</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {exploreBy === "relation" ? (
              <div className="mt-3 space-y-2">
                <input
                  value={relationQuery}
                  onChange={(event) => setRelationQuery(event.target.value)}
                  placeholder="Search relation"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                  {relationOptions.map((relation) => (
                    <button
                      key={relation.id}
                      type="button"
                      onClick={() => {
                        setSelectedRelationId(relation.id);
                        gi.setMode("guided");
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        selectedRelationId === relation.id
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {relation.label}
                      <span className="ml-1 text-slate-400">({relation.candidateCount})</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {exploreBy === "candidate" ? (
              <div className="mt-3">
                <input
                  value={candidateQuery}
                  onChange={(event) => setCandidateQuery(event.target.value)}
                  placeholder="Search candidate by head, relation, or tail"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {graphTitle ? <p className="text-sm font-medium text-slate-800">{graphTitle}</p> : null}
                  <p className="text-xs text-slate-500">
                    Known relations are solid edges. Generated candidates are red dashed edges.
                  </p>
                  {graph?.overflow ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {graph.overflow.knownMore > 0 ? `+ ${graph.overflow.knownMore} more known relations. ` : ""}
                      {graph.overflow.candidateMore > 0
                        ? `+ ${graph.overflow.candidateMore} more generated candidates.`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {gi.mode === "explore" ? (
                    <button
                      type="button"
                      onClick={() => setExtraHop((value) => !value)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      {extraHop ? "Less context" : "Load more context"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => gi.setMode(gi.mode === "explore" ? "guided" : "explore")}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {gi.mode === "explore" ? "Back to Guided View" : "Explore context"}
                  </button>
                </div>
              </div>
              <InteractiveGraph
                graph={graph}
                title={graph?.caption}
                height={380}
                fitKey={gi.fitKey}
                selectedNodeId={gi.inspect?.type === "node" ? gi.inspect.id : null}
                selectedEdgeId={gi.inspect?.type === "edge" ? gi.inspect.id : null}
                onNodeClick={gi.onNodeClick}
                onEdgeClick={gi.onEdgeClick}
                onPaneClick={gi.onPaneClick}
                emptyMessage="Select an entity, relation, or candidate to explore the graph."
              />
              {gi.inspect ? (
                <GraphInspector
                  target={gi.inspect}
                  scenario={scenario}
                  graph={graph}
                  selectedCandidate={selectedCandidate}
                  onClose={gi.onInspectClose}
                  generationMode
                  explorerLabels={explorer?.labels}
                />
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">Generated candidate relations</p>
              <p className="mt-0.5 text-xs text-slate-500">Select a candidate to highlight it in the graph.</p>
              {listCandidates.length === 0 ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                  No generated candidates match this selection.
                </p>
              ) : (
                <>
                  <p className="mt-3 text-xs text-slate-500">
                    Showing 1-{showingEnd} of {listCandidates.length}
                  </p>
                  <div className="mt-2 max-h-[420px] space-y-2 overflow-y-auto">
                    {shownCandidates.map((candidate) => (
                      <CandidateTripleCard
                        key={candidate.id}
                        candidate={candidate}
                        selected={selectedCandidateId === candidate.id}
                        onSelect={onSelectCandidate}
                        generationMode
                      />
                    ))}
                  </div>
                  {showLimit < listCandidates.length ? (
                    <button
                      type="button"
                      onClick={() => setShowLimit((value) => value + LIST_PAGE_SIZE)}
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Show more candidates
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedCandidate || !generated}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Continue to Structural Validation
        </button>
      </div>
    </div>
  );
}
