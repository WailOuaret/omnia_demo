import { InteractiveGraph } from "./InteractiveGraph";
import { GraphInspector } from "./GraphInspector";
import { SummaryMetricCards, type MetricItem } from "./SummaryMetricCards";
import { CollapsibleDetails } from "./CollapsibleDetails";
import type { GraphInteraction } from "./screenInteraction";
import { buildValidationGraph } from "../../lib/buildValidationGraph";
import { buildNeighbourhoodGraph } from "../../lib/buildExploreGraph";
import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

function fmt(value: number | null | undefined): string {
  return value == null ? "Not included" : value.toLocaleString();
}

function candidatePassed(candidate: PresentationCandidate | null): boolean | null {
  if (!candidate || candidate.distance == null || candidate.threshold == null) return null;
  return candidate.distance <= candidate.threshold;
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
  const passedCount = metrics.filteringAccepted;
  const queue = metrics.filterQueueCount ?? metrics.generatedCandidates;
  const filteringRate = queue && passedCount != null ? Math.round((passedCount / queue) * 100) : null;
  const ranked = [...scenario.candidates]
    .filter((candidate) => candidate.distance != null)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  const rank = selectedCandidate ? ranked.findIndex((candidate) => candidate.id === selectedCandidate.id) + 1 : 0;
  const passed = candidatePassed(selectedCandidate);
  const edgeKind = passed === false ? "rejected" : passed === true ? "accepted" : "candidate";
  const graph =
    gi.mode === "explore"
      ? buildNeighbourhoodGraph(scenario, selectedCandidate, edgeKind)
      : buildValidationGraph(selectedCandidate, edgeKind);

  const metricsCards: MetricItem[] = [
    { label: "Generated candidates", value: fmt(metrics.generatedCandidates) },
    { label: "Passed structural validation", value: fmt(passedCount), tone: "green" },
    ...(filteringRate != null ? [{ label: "Filtering rate", value: `${filteringRate}%` } as MetricItem] : []),
    ...(selectedCandidate?.distance != null
      ? [
          {
            label: "Selected candidate score",
            value: selectedCandidate.distance.toFixed(4),
            tone: "blue" as const,
          },
        ]
      : []),
    ...(rank > 0 ? [{ label: "Ranking position", value: `#${rank} of ${ranked.length}` } as MetricItem] : []),
  ];

  const details = [
    metrics.filteringModel ? ["Model", metrics.filteringModel] : null,
    selectedCandidate?.distance != null ? ["Distance score", selectedCandidate.distance.toFixed(4)] : null,
    selectedCandidate?.threshold != null
      ? ["Threshold", selectedCandidate.threshold.toFixed(4)]
      : metrics.threshold != null
        ? ["Threshold", metrics.threshold.toFixed(4)]
        : null,
    rank > 0 ? ["Rank", `#${rank} of ${ranked.length}`] : null,
    passed != null ? ["Status", passed ? "Passed" : "Removed"] : null,
  ].filter((item): item is [string, string] => Boolean(item));

  return (
    <div className="space-y-4">
      <SummaryMetricCards items={metricsCards} />

      {!selectedCandidate ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No candidate is selected for this dataset. Structural validation runs after candidate generation.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                {gi.mode === "explore" ? "Local neighbourhood. Click nodes and edges." : "Candidate in local graph context."}
              </p>
              <button
                type="button"
                onClick={() => gi.setMode(gi.mode === "explore" ? "guided" : "explore")}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {gi.mode === "explore" ? "Back to Guided View" : "Explore candidate context"}
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
            {passed != null ? (
              <div
                className={`rounded-xl border px-3 py-2.5 text-sm ${
                  passed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                <p className="font-semibold">
                  {passed ? "Passed structural validation" : "Removed by structural validation"}
                </p>
                <p className="mt-1">
                  {passed
                    ? "This candidate passed structural validation and is eligible for semantic validation."
                    : "This candidate was removed because it did not fit the graph structure strongly enough."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                Structural score is not included for this prepared sample.
              </div>
            )}
          </div>
        </div>
      )}

      <CollapsibleDetails label="Show technical details">
        {details.length ? (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {details.map(([key, value]) => (
              <Detail key={key} k={key} v={value} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No additional technical fields are included for this sample.</p>
        )}
      </CollapsibleDetails>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue to Semantic Validation
        </button>
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-800">{v}</span>
    </div>
  );
}
