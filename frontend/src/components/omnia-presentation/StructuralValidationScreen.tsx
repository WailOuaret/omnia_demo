import { InteractiveGraph } from "./InteractiveGraph";
import { GraphInspector } from "./GraphInspector";
import { SummaryMetricCards } from "./SummaryMetricCards";
import { CollapsibleDetails } from "./CollapsibleDetails";
import type { GraphInteraction } from "./screenInteraction";
import { buildValidationGraph } from "../../lib/buildValidationGraph";
import { buildNeighbourhoodGraph } from "../../lib/buildExploreGraph";
import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

function fmt(value: number | null | undefined): string {
  return value == null ? "—" : value.toLocaleString();
}

function TripleDisplay({ candidate }: { candidate: PresentationCandidate }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        { tag: "Head", value: formatEntityLabel(candidate.head) },
        { tag: "Relation", value: formatRelationLabel(candidate.relation) },
        { tag: "Tail", value: formatEntityLabel(candidate.tail) },
      ].map((part) => (
        <div key={part.tag} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{part.tag}</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">{part.value}</p>
        </div>
      ))}
    </div>
  );
}

export function StructuralValidationScreen({
  scenario,
  selectedCandidate,
  onContinue,
  gi,
}: {
  scenario: PresentationScenario;
  selectedCandidate: PresentationCandidate | null;
  onContinue: () => void;
  gi: GraphInteraction;
}) {
  const { metrics } = scenario;
  const accepted = metrics.filteringAccepted ?? 0;
  const queue = metrics.filterQueueCount ?? metrics.generatedCandidates ?? 0;
  const filteringRate = queue > 0 ? Math.round((accepted / queue) * 100) : null;

  const ranked = [...scenario.candidates]
    .filter((c) => c.distance != null)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  const rank = selectedCandidate ? ranked.findIndex((c) => c.id === selectedCandidate.id) + 1 : 0;

  const hasScore = selectedCandidate?.distance != null && selectedCandidate?.threshold != null;
  const passed = hasScore ? (selectedCandidate!.distance as number) <= (selectedCandidate!.threshold as number) : null;
  const edgeKind = passed === false ? "rejected" : "candidate";
  const graph =
    gi.mode === "explore"
      ? buildNeighbourhoodGraph(scenario, selectedCandidate, edgeKind)
      : buildValidationGraph(selectedCandidate, edgeKind);

  return (
    <div className="space-y-4">
      <SummaryMetricCards
        items={[
          { label: "Generated candidates", value: fmt(metrics.generatedCandidates) },
          { label: "Passed structural validation", value: fmt(metrics.filteringAccepted), tone: "green" },
          { label: "Filtering rate", value: filteringRate == null ? "—" : `${filteringRate}%` },
          {
            label: "Selected candidate score",
            value: selectedCandidate?.distance != null ? selectedCandidate.distance.toFixed(2) : "—",
            tone: "blue",
          },
          { label: "Ranking position", value: rank > 0 ? `#${rank} of ${ranked.length}` : "—" },
        ]}
      />

      {!selectedCandidate ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No candidate is selected for this dataset. Structural validation runs on generated candidates; this prepared
          slice did not retain one to inspect.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                {gi.mode === "explore" ? "Local neighbourhood — click nodes and edges." : "Guided view — candidate in local structure."}
              </p>
              <button
                type="button"
                onClick={() => gi.setMode(gi.mode === "explore" ? "guided" : "explore")}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {gi.mode === "explore" ? "Back to guided view" : "Explore candidate context"}
              </button>
            </div>
            <InteractiveGraph
              graph={graph}
              height={300}
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
            <TripleDisplay candidate={selectedCandidate} />
            {hasScore ? (
              <div
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                  passed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {passed ? "✓ Passed structural validation" : "✗ Removed by structural validation"}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                Structural scores are not included in this prepared demo.
              </div>
            )}
          </div>
        </div>
      )}

      <CollapsibleDetails label="Show technical details">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Detail k="Model" v={metrics.filteringModel ?? "TransE"} />
          <Detail k="Distance score" v={selectedCandidate?.distance != null ? selectedCandidate.distance.toFixed(4) : "Not included"} />
          <Detail k="Threshold (τ)" v={selectedCandidate?.threshold != null ? selectedCandidate.threshold.toFixed(4) : metrics.threshold?.toFixed(4) ?? "Not included"} />
          <Detail k="Rank" v={rank > 0 ? `#${rank} of ${ranked.length}` : "Not included"} />
          <Detail k="Status" v={passed == null ? "Not included" : passed ? "Passed" : "Removed"} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          TransE scores each candidate by how close embedding(head) + embedding(relation) is to embedding(tail). A lower
          distance below the threshold τ means the candidate fits the graph structure.
        </p>
      </CollapsibleDetails>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue to Semantic Validation →
        </button>
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-800">{v}</span>
    </div>
  );
}
