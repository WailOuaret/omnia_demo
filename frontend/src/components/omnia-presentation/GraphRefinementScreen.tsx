import { InteractiveGraph } from "./InteractiveGraph";
import { GraphToolbar } from "./GraphNavPanel";
import { GraphInspector } from "./GraphInspector";
import { SummaryMetricCards } from "./SummaryMetricCards";
import { CollapsibleDetails } from "./CollapsibleDetails";
import { CandidateTripleCard } from "./CandidateTripleCard";
import type { GraphInteraction } from "./screenInteraction";
import { buildRefinementGraph, type RefinementDecision } from "../../lib/buildRefinementGraph";
import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

function fmt(value: number | null | undefined): string {
  return value == null ? "Not included" : value.toLocaleString();
}

const DECISIONS: { key: Exclude<RefinementDecision, "none">; label: string; cls: string }[] = [
  { key: "accepted", label: "Accept", cls: "bg-emerald-600 hover:bg-emerald-700" },
  { key: "rejected", label: "Reject", cls: "bg-rose-600 hover:bg-rose-700" },
  { key: "uncertain", label: "Uncertain", cls: "bg-amber-600 hover:bg-amber-700" },
  { key: "corrected", label: "Correct", cls: "bg-violet-600 hover:bg-violet-700" },
];

function banner(decision: RefinementDecision): { text: string; cls: string } {
  switch (decision) {
    case "accepted":
      return { text: "Relation accepted. It is added to the graph.", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    case "rejected":
      return { text: "Relation rejected. It is left out of the graph.", cls: "border-rose-200 bg-rose-50 text-rose-800" };
    case "uncertain":
      return { text: "Marked uncertain. It stays in the review queue.", cls: "border-amber-200 bg-amber-50 text-amber-900" };
    case "corrected":
      return { text: "Marked for correction. The proposed edge is tracked as corrected.", cls: "border-violet-200 bg-violet-50 text-violet-800" };
    default:
      return { text: "Choose a decision to update the graph.", cls: "border-slate-200 bg-slate-50 text-slate-600" };
  }
}

export function GraphRefinementScreen({
  scenario,
  selectedCandidate,
  decision,
  acceptedCount,
  rejectedCount,
  uncertainCount,
  correctedCount,
  onDecide,
  onResetFeedback,
  onSelectCandidate,
  onRestart,
  gi,
}: {
  scenario: PresentationScenario;
  selectedCandidate: PresentationCandidate | null;
  decision: RefinementDecision;
  acceptedCount: number;
  rejectedCount: number;
  uncertainCount: number;
  correctedCount: number;
  onDecide: (decision: Exclude<RefinementDecision, "none">) => void;
  onResetFeedback: () => void;
  onSelectCandidate: (id: string) => void;
  onRestart: () => void;
  gi: GraphInteraction;
}) {
  const graph = buildRefinementGraph(selectedCandidate, decision);
  const totalCandidates = scenario.metrics.generatedCandidates ?? scenario.candidates.length;
  const decidedCount = acceptedCount + rejectedCount + uncertainCount + correctedCount;
  const remaining = Math.max(0, totalCandidates - decidedCount);
  const knownTriples = scenario.sample.knownTriples ?? scenario.paperStats.triples ?? 0;
  const finalTriples = knownTriples + acceptedCount + correctedCount;
  const bn = banner(decision);

  return (
    <div className="space-y-4">
      {!selectedCandidate ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No candidate is selected to refine for this dataset.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              <GraphToolbar
                scenario={scenario}
                mode={gi.mode}
                onModeChange={gi.setMode}
                onFit={gi.onFit}
                onFocusNode={gi.onFocusNode}
              />
              <InteractiveGraph
                graph={graph}
                title="Updated graph context"
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
              <div className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${bn.cls}`}>{bn.text}</div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Selected candidate</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{formatEntityLabel(selectedCandidate.head)}</span>
                  <span className="text-blue-600">-&gt; {formatRelationLabel(selectedCandidate.relation)} -&gt;</span>
                  <span className="font-semibold text-slate-900">{formatEntityLabel(selectedCandidate.tail)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DECISIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onDecide(item.key)}
                    disabled={decision !== "none" && decision !== item.key}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${item.cls} ${
                      decision === item.key ? "ring-2 ring-offset-1 ring-slate-400" : ""
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {decision === "corrected" ? (
                <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-800">
                  Correction placeholder: the full system can open head, relation, and tail editing here. This prepared
                  sample records the candidate as corrected.
                </div>
              ) : null}

              {decision !== "none" ? (
                <button
                  type="button"
                  onClick={onResetFeedback}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Reset decision
                </button>
              ) : null}
            </div>
          </div>

          <SummaryMetricCards
            items={[
              { label: "Accepted relations", value: fmt(acceptedCount), tone: "green" },
              { label: "Rejected relations", value: fmt(rejectedCount), tone: "red" },
              { label: "Uncertain", value: fmt(uncertainCount), tone: "amber" },
              { label: "Corrected", value: fmt(correctedCount), tone: "blue" },
              { label: "Remaining candidates", value: fmt(remaining) },
              { label: "Final triples", value: fmt(finalTriples), tone: "blue" },
            ]}
          />

          {scenario.candidates.length > 1 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">Choose another candidate</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {scenario.candidates.slice(0, 8).map((candidate) => (
                  <CandidateTripleCard
                    key={candidate.id}
                    candidate={candidate}
                    selected={selectedCandidate.id === candidate.id}
                    onSelect={onSelectCandidate}
                    compact
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <CollapsibleDetails label="Show detailed before / after comparison">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Before</p>
            <p className="mt-1 text-sm text-slate-700">{fmt(knownTriples)} known triples</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-600">After</p>
            <p className="mt-1 text-sm text-emerald-800">
              {fmt(finalTriples)} triples ({acceptedCount + correctedCount > 0 ? `+${acceptedCount + correctedCount} additions` : "no additions yet"})
            </p>
          </div>
        </div>
      </CollapsibleDetails>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Restart Demo
        </button>
      </div>
    </div>
  );
}
