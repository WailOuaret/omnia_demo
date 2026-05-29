import { useState } from "react";
import { InteractiveGraph } from "./InteractiveGraph";
import { GraphInspector } from "./GraphInspector";
import { CandidateTripleCard } from "./CandidateTripleCard";
import { SummaryMetricCards } from "./SummaryMetricCards";
import { CollapsibleDetails } from "./CollapsibleDetails";
import type { GraphInteraction } from "./screenInteraction";
import { buildCandidateGraph } from "../../lib/buildCandidateGraph";
import { buildExploreGraph } from "../../lib/buildExploreGraph";
import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

function fmt(value: number | null | undefined): string {
  return value == null ? "—" : value.toLocaleString();
}

export function CandidateGenerationScreen({
  scenario,
  selectedCandidate,
  onSelectCandidate,
  onContinue,
  gi,
}: {
  scenario: PresentationScenario;
  selectedCandidate: PresentationCandidate | null;
  onSelectCandidate: (id: string) => void;
  onContinue: () => void;
  gi: GraphInteraction;
}) {
  const [showAll, setShowAll] = useState(false);
  const graph =
    gi.mode === "explore"
      ? buildExploreGraph(scenario, selectedCandidate)
      : buildCandidateGraph(scenario, selectedCandidate);
  const visibleCandidates = showAll ? scenario.candidates : scenario.candidates.slice(0, 5);

  return (
    <div className="space-y-4">
      <SummaryMetricCards
        items={[
          { label: "Dataset", value: scenario.shortName },
          { label: "Nodes", value: fmt(scenario.paperStats.entities) },
          { label: "Relations", value: fmt(scenario.paperStats.relations) },
          { label: "Known triples", value: fmt(scenario.sample.knownTriples ?? scenario.paperStats.triples) },
          { label: "Generated candidates", value: fmt(scenario.metrics.generatedCandidates), tone: "blue" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              {gi.mode === "explore" ? "Exploring cluster context — click nodes and edges." : "Guided view — selected relation pattern."}
            </p>
            <button
              type="button"
              onClick={() => gi.setMode(gi.mode === "explore" ? "guided" : "explore")}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              {gi.mode === "explore" ? "Back to guided view" : "Explore context"}
            </button>
          </div>
          <InteractiveGraph
            graph={graph}
            height={380}
            fitKey={gi.fitKey}
            selectedNodeId={gi.inspect?.type === "node" ? gi.inspect.id : null}
            selectedEdgeId={gi.inspect?.type === "edge" ? gi.inspect.id : null}
            onNodeClick={gi.onNodeClick}
            onEdgeClick={gi.onEdgeClick}
            onPaneClick={gi.onPaneClick}
          />
          {gi.inspect ? (
            <GraphInspector
              target={gi.inspect}
              scenario={scenario}
              graph={graph}
              selectedCandidate={selectedCandidate}
              onClose={gi.onInspectClose}
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">Top Candidate Relations</p>
            <p className="mt-0.5 text-xs text-slate-500">Select a candidate to highlight it in the graph.</p>
            {scenario.candidates.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                No candidate relations were generated for this prepared slice.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {visibleCandidates.map((candidate) => (
                  <CandidateTripleCard
                    key={candidate.id}
                    candidate={candidate}
                    selected={selectedCandidate?.id === candidate.id}
                    onSelect={onSelectCandidate}
                  />
                ))}
                {scenario.candidates.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {showAll ? "Show fewer" : `Show more candidates (${scenario.candidates.length - 5})`}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCandidate ? (
        <CollapsibleDetails label="Show how this candidate was generated">
          <div className="space-y-2 text-sm">
            <p>
              Shared pattern:{" "}
              <span className="font-medium text-slate-800">
                ( ·, {formatRelationLabel(scenario.cluster.sharedRelation)},{" "}
                {formatEntityLabel(scenario.cluster.sharedTail)} )
              </span>
            </p>
            {scenario.cluster.members.length ? (
              <p className="text-slate-600">
                Similar heads sharing this pattern:{" "}
                {scenario.cluster.members.slice(0, 6).map((m) => formatEntityLabel(m)).join(", ")}
              </p>
            ) : null}
            <p className="text-slate-600">
              {selectedCandidate.whyGenerated ??
                "Proposed because this head belongs to the same relation–tail pattern as the others."}
            </p>
          </div>
        </CollapsibleDetails>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue to Structural Validation →
        </button>
      </div>
    </div>
  );
}
