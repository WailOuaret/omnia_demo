import { useEffect, useMemo, useRef, useState } from "react";
import { InteractiveGraph } from "./InteractiveGraph";
import { GraphToolbar } from "./GraphNavPanel";
import { GraphInspector } from "./GraphInspector";
import { CandidateTripleCard } from "./CandidateTripleCard";
import { SummaryMetricCards } from "./SummaryMetricCards";
import type { GraphInteraction } from "./screenInteraction";
import {
  buildEntityExplorationGraph,
  buildRelationExplorationGraph,
} from "../../lib/buildCandidateExploreGraph";
import {
  explorerTripleToPresentation,
  filterCandidatesForExplore,
  pickDefaultExploreEntity,
  pickDefaultExploreRelation,
  searchEntities,
  searchRelations,
  type CandidateExploreBy,
  type EntityIndexEntry,
  type OmniaCandidateExplorer,
  type RelationIndexEntry,
} from "../../lib/omniaCandidateExplorer";
import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

const CANDIDATE_LIST_PAGE = 8;
const AUTOCOMPLETE_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 150;

function fmt(value: number | null | undefined): string {
  return value == null ? "Not included" : value.toLocaleString();
}

function ExploreSearchAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  explorer,
  mode,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (id: string) => void;
  placeholder: string;
  explorer: OmniaCandidateExplorer;
  mode: CandidateExploreBy;
}) {
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(value), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  const results = useMemo(() => {
    if (mode === "entity") {
      return searchEntities(explorer, debouncedQuery, AUTOCOMPLETE_LIMIT);
    }
    return searchRelations(explorer, debouncedQuery, AUTOCOMPLETE_LIMIT);
  }, [explorer, debouncedQuery, mode]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const confirmFirstMatch = () => {
    if (results.length > 0) {
      onSelect(results[0].id);
    }
    setOpen(false);
  };

  const formatResultLabel = (item: EntityIndexEntry | RelationIndexEntry) => {
    if (mode === "entity") {
      const entity = item as EntityIndexEntry;
      return formatEntityLabel(entity.id, explorer.labels.get(entity.id));
    }
    return formatRelationLabel(item.id);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirmFirstMatch();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={confirmFirstMatch}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Find
        </button>
      </div>
      {open ? (
        <ul
          role="listbox"
          aria-label={mode === "entity" ? "Matching entities" : "Matching relations"}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length > 0 ? (
            results.map((item) => (
              <li key={item.id} role="option">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="min-w-0 truncate">{formatResultLabel(item)}</span>
                  <span className="shrink-0 text-xs text-slate-400">{item.candidateCount}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-slate-500">
              {value.trim() ? "No matches found." : "No suggestions available."}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
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
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [extraHop, setExtraHop] = useState(false);
  const [showLimit, setShowLimit] = useState(CANDIDATE_LIST_PAGE);

  useEffect(() => {
    if (!explorer) return;
    setGenerated(false);
    setExploreBy("entity");
    setEntityQuery("");
    setRelationQuery("");
    setSelectedEntityId(null);
    setSelectedRelationId(null);
    setExtraHop(false);
    setShowLimit(CANDIDATE_LIST_PAGE);
  }, [explorer?.datasetId]);

  const filteredTriples = useMemo(() => {
    if (!explorer) return [];
    return filterCandidatesForExplore(explorer, exploreBy, selectedEntityId, selectedRelationId);
  }, [explorer, exploreBy, selectedEntityId, selectedRelationId]);

  const listCandidates: PresentationCandidate[] = useMemo(
    () => filteredTriples.map(explorerTripleToPresentation),
    [filteredTriples],
  );

  useEffect(() => {
    setShowLimit(CANDIDATE_LIST_PAGE);
  }, [exploreBy, selectedEntityId, selectedRelationId]);

  // Keep parent selectedCandidateId across workflow steps; only pick a default when missing.
  useEffect(() => {
    if (!explorer || listCandidates.length === 0) return;
    if (selectedCandidateId == null) {
      onSelectCandidate(listCandidates[0].id);
      return;
    }
    const stillValid =
      listCandidates.some((c) => c.id === selectedCandidateId) ||
      explorer.candidateIndex.has(selectedCandidateId);
    if (!stillValid) onSelectCandidate(listCandidates[0].id);
  }, [explorer?.datasetId, listCandidates, selectedCandidateId, onSelectCandidate]);

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
  const listTitle =
    exploreBy === "entity" ? "Candidates for selected entity" : "Generated candidates for relation";

  const handleSelectEntity = (entityId: string) => {
    setSelectedEntityId(entityId);
    gi.setMode("guided");
  };

  const handleSelectRelation = (relationId: string) => {
    setSelectedRelationId(relationId);
    gi.setMode("guided");
  };

  const handleGenerate = () => {
    if (!explorer) return;
    setGenerated(true);
    setExploreBy("entity");
    const defaultEntity = pickDefaultExploreEntity(explorer);
    if (defaultEntity) {
      setSelectedEntityId(defaultEntity.id);
      setSelectedRelationId(null);
      gi.setMode("guided");
    }
  };

  const selectedEntityLabel =
    selectedEntityId && explorer
      ? formatEntityLabel(selectedEntityId, explorer.labels.get(selectedEntityId))
      : null;
  const selectedEntityCandidateCount =
    selectedEntityId && explorer
      ? (explorer.entityIndex.get(selectedEntityId)?.candidateCount ?? 0)
      : 0;
  const selectedRelationLabel = selectedRelationId ? formatRelationLabel(selectedRelationId) : null;
  const selectedRelationCandidateCount =
    selectedRelationId && explorer
      ? (explorer.relationIndex.get(selectedRelationId)?.candidateCount ?? 0)
      : 0;

  return (
    <div className="space-y-3">
      <SummaryMetricCards
        items={[
          { label: "Dataset", value: scenario.shortName },
          { label: "Nodes", value: fmt(scenario.paperStats.entities) },
          { label: "Relations", value: fmt(scenario.paperStats.relations) },
          { label: "Known triples", value: fmt(scenario.sample.knownTriples ?? scenario.paperStats.triples) },
          { label: "Generated candidates", value: fmt(generatedCount), tone: "blue" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!explorer || generated}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Generate Candidates
        </button>
        {generated ? (
          <p className="text-sm text-emerald-800">
            Candidate generation completed successfully. Total candidates generated: {fmt(generatedCount)}.
          </p>
        ) : (
          <p className="text-xs text-slate-500">Run generation on the prepared sample.</p>
        )}
      </div>

      {generated ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Explore by</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["entity", "relation"] as CandidateExploreBy[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setExploreBy(mode);
                    if (!explorer) return;
                    if (mode === "entity" && !selectedEntityId) {
                      const defaultEntity = pickDefaultExploreEntity(explorer);
                      if (defaultEntity) setSelectedEntityId(defaultEntity.id);
                    }
                    if (mode === "relation" && !selectedRelationId) {
                      const defaultRelation = pickDefaultExploreRelation(explorer);
                      if (defaultRelation) setSelectedRelationId(defaultRelation.id);
                    }
                  }}
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

            {exploreBy === "entity" && explorer ? (
              <div className="mt-3 space-y-2">
                <ExploreSearchAutocomplete
                  value={entityQuery}
                  onChange={setEntityQuery}
                  onSelect={handleSelectEntity}
                  placeholder="Search entity ID or name"
                  explorer={explorer}
                  mode="entity"
                />
                {selectedEntityLabel ? (
                  <p className="text-xs text-slate-600">
                    Showing candidates for{" "}
                    <span className="font-medium text-slate-800">{selectedEntityLabel}</span>
                    {selectedEntityCandidateCount > 0 ? (
                      <span className="text-slate-500"> ({selectedEntityCandidateCount} candidates)</span>
                    ) : null}
                    . Search to explore other entities.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Search for an entity by ID or name to explore candidates.</p>
                )}
              </div>
            ) : null}

            {exploreBy === "relation" && explorer ? (
              <div className="mt-3 space-y-2">
                <ExploreSearchAutocomplete
                  value={relationQuery}
                  onChange={setRelationQuery}
                  onSelect={handleSelectRelation}
                  placeholder="Search relation"
                  explorer={explorer}
                  mode="relation"
                />
                {selectedRelationLabel ? (
                  <p className="text-xs text-slate-600">
                    Showing candidates for relation{" "}
                    <span className="font-medium text-slate-800">{selectedRelationLabel}</span>
                    {selectedRelationCandidateCount > 0 ? (
                      <span className="text-slate-500"> ({selectedRelationCandidateCount} candidates)</span>
                    ) : null}
                    . Search to explore other relations.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Search for a relation to explore candidates.</p>
                )}
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
                </div>
              </div>
              <GraphToolbar
                scenario={scenario}
                mode={gi.mode}
                onModeChange={gi.setMode}
                onFit={gi.onFit}
                onFocusNode={gi.onFocusNode}
              />
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
                emptyMessage="Search and select an entity or relation to explore the graph."
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
              <p className="text-sm font-semibold text-slate-900">{listTitle}</p>
              <p className="mt-0.5 text-xs text-slate-500">Select a candidate to highlight it in the graph.</p>
              {listCandidates.length === 0 ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                  {exploreBy === "entity" && !selectedEntityId
                    ? "Search and select an entity to view generated candidates."
                    : exploreBy === "relation" && !selectedRelationId
                      ? "Search and select a relation to view generated candidates."
                      : "No generated candidates match this selection."}
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
                      onClick={() => setShowLimit((value) => value + CANDIDATE_LIST_PAGE)}
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
