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

function fmt(value: number | null | undefined): string {
  return value == null ? "—" : value.toLocaleString();
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
  const [exploreBy, setExploreBy] = useState<CandidateExploreBy>("entity");
  const [entityQuery, setEntityQuery] = useState("");
  const [relationQuery, setRelationQuery] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [extraHop, setExtraHop] = useState(false);

  useEffect(() => {
    if (!explorer) return;
    const firstEntity = explorer.topEntities[0]?.id ?? null;
    setSelectedEntityId(firstEntity);
    setSelectedRelationId(explorer.topRelations[0]?.id ?? null);
    setExtraHop(false);
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

  const selectedCandidate = useMemo(() => {
    if (!selectedCandidateId) return listCandidates[0] ?? null;
    return (
      listCandidates.find((c) => c.id === selectedCandidateId) ??
      (explorer?.candidateIndex.get(selectedCandidateId)
        ? explorerTripleToPresentation(explorer.candidateIndex.get(selectedCandidateId)!)
        : null)
    );
  }, [selectedCandidateId, listCandidates, explorer]);

  useEffect(() => {
    if (listCandidates.length === 0) return;
    if (!selectedCandidateId || !listCandidates.some((c) => c.id === selectedCandidateId)) {
      onSelectCandidate(listCandidates[0].id);
    }
  }, [listCandidates, selectedCandidateId, onSelectCandidate]);

  const graph = useMemo(() => {
    if (!explorer) return null;
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
  }, [explorer, exploreBy, selectedEntityId, selectedRelationId, selectedCandidateId, gi.mode, extraHop]);

  const graphTitle = useMemo(() => {
    if (exploreBy === "entity" && selectedEntityId) {
      return `Selected entity: ${formatEntityLabel(selectedEntityId, explorer?.labels.get(selectedEntityId))}`;
    }
    if (exploreBy === "relation" && selectedRelationId) {
      return `Relation: ${formatRelationLabel(selectedRelationId)}`;
    }
    if (selectedCandidate) {
      return `Selected candidate: ${formatEntityLabel(selectedCandidate.head)} → ${formatRelationLabel(selectedCandidate.relation)} → ${formatEntityLabel(selectedCandidate.tail)}`;
    }
    return undefined;
  }, [exploreBy, selectedEntityId, selectedRelationId, selectedCandidate, explorer]);

  const generatedCount = explorer?.metrics.generatedCandidates ?? scenario.metrics.generatedCandidates;

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
              onChange={(e) => setEntityQuery(e.target.value)}
              placeholder="Search entity ID or name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {entityOptions.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setSelectedEntityId(e.id);
                    gi.setMode("guided");
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    selectedEntityId === e.id
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {e.label}
                  <span className="ml-1 text-slate-400">({e.candidateCount})</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {exploreBy === "relation" ? (
          <div className="mt-3 space-y-2">
            <input
              value={relationQuery}
              onChange={(e) => setRelationQuery(e.target.value)}
              placeholder="Search relation"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {relationOptions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRelationId(r.id);
                    gi.setMode("guided");
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    selectedRelationId === r.id
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {r.label}
                  <span className="ml-1 text-slate-400">({r.candidateCount})</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {exploreBy === "candidate" ? (
          <div className="mt-3">
            <input
              value={candidateQuery}
              onChange={(e) => setCandidateQuery(e.target.value)}
              placeholder="Filter candidates"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {graphTitle ? (
                <p className="text-sm font-medium text-slate-800">{graphTitle}</p>
              ) : null}
              <p className="text-xs text-slate-500">
                Known relations are solid edges. Generated candidates are red dashed edges.
              </p>
            </div>
            <div className="flex gap-2">
              {gi.mode === "explore" ? (
                <button
                  type="button"
                  onClick={() => setExtraHop((v) => !v)}
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
                {gi.mode === "explore" ? "Back to guided view" : "Explore context"}
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
            emptyMessage={
              explorer
                ? "Select an entity, relation, or candidate to explore the graph."
                : "Loading exploration data…"
            }
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
          <p className="text-[11px] text-slate-400">
            Some benchmark entities use raw IDs when names are not available.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Generated candidate relations</p>
          <p className="mt-0.5 text-xs text-slate-500">Select a candidate to highlight it in the graph.</p>
          {listCandidates.length === 0 ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              No generated candidates match this selection.
            </p>
          ) : (
            <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
              {listCandidates.map((candidate) => (
                <CandidateTripleCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selectedCandidateId === candidate.id}
                  onSelect={onSelectCandidate}
                  generationMode
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedCandidate}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Continue to Structural Validation →
        </button>
      </div>
    </div>
  );
}
