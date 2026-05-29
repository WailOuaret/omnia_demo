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

function verdictMeta(decision: string | null | undefined) {
  switch (decision) {
    case "valid":
      return { label: "Validated", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    case "invalid":
      return { label: "Rejected", cls: "border-rose-200 bg-rose-50 text-rose-800" };
    case "uncertain":
      return { label: "Uncertain", cls: "border-[#fcd34d] bg-[#fffbeb] text-[#92400e]" };
    default:
      return null;
  }
}

export function SemanticValidationScreen({
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
  const llmAvailable = metrics.llmAvailable;
  const verdict = llmAvailable ? verdictMeta(selectedCandidate?.llmDecision) : null;
  const edgeKind = llmAvailable && selectedCandidate?.llmDecision === "invalid" ? "rejected" : "candidate";
  const graph =
    gi.mode === "explore"
      ? buildNeighbourhoodGraph(scenario, selectedCandidate, edgeKind)
      : buildValidationGraph(selectedCandidate, edgeKind);

  return (
    <div className="space-y-4">
      <SummaryMetricCards
        items={[
          { label: "Structurally validated", value: fmt(metrics.filteringAccepted) },
          { label: "LLM validated", value: llmAvailable ? fmt(metrics.llmAccepted) : "—", tone: "green" },
          {
            label: "Validation rate",
            value:
              llmAvailable && (metrics.filteringAccepted ?? 0) > 0
                ? `${Math.round(((metrics.llmAccepted ?? 0) / (metrics.filteringAccepted as number)) * 100)}%`
                : "—",
          },
          {
            label: "Confidence score",
            value: llmAvailable && selectedCandidate?.llmScore != null ? selectedCandidate.llmScore.toFixed(2) : "—",
            tone: "blue",
          },
          { label: "Validation result", value: verdict?.label ?? "—" },
        ]}
      />

      {!selectedCandidate ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No candidate is selected for this dataset, so there is nothing to validate semantically here.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                {gi.mode === "explore" ? "Local neighbourhood — click nodes and edges." : "Guided view — candidate in local context."}
              </p>
              <button
                type="button"
                onClick={() => gi.setMode(gi.mode === "explore" ? "guided" : "explore")}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {gi.mode === "explore" ? "Back to guided view" : "Open graph context"}
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
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-slate-900">{formatEntityLabel(selectedCandidate.head)}</span>
                <span className="text-blue-600">→ {formatRelationLabel(selectedCandidate.relation)} →</span>
                <span className="font-semibold text-slate-900">{formatEntityLabel(selectedCandidate.tail)}</span>
              </div>
            </div>

            {llmAvailable && verdict ? (
              <>
                <div className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${verdict.cls}`}>
                  {verdict.label}
                  {selectedCandidate.llmScore != null ? (
                    <span className="ml-2 font-normal opacity-80">confidence {selectedCandidate.llmScore.toFixed(2)}</span>
                  ) : null}
                </div>
                {selectedCandidate.llmRationale ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                    {selectedCandidate.llmRationale}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                This prepared demo shows where LLM validation appears in the OMNIA workflow.
              </div>
            )}
          </div>
        </div>
      )}

      <CollapsibleDetails label="Show validation context">
        <div className="space-y-2 text-sm">
          <Detail
            k="Prompting mode"
            v={
              scenario.recommendedMode === "sentence-rag"
                ? "Sentence-based RAG"
                : "Triple-based RAG"
            }
          />
          <Detail k="Retrieval depth (top-k)" v={metrics.llmTopK != null ? String(metrics.llmTopK) : "Not included"} />
          {llmAvailable && selectedCandidate?.retrievedContext?.length ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-500">Retrieved context triples</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {selectedCandidate.retrievedContext.slice(0, 4).map((ctx, i) => (
                  <li key={i} className="font-mono">{ctx.replace(/\n/g, " · ")}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Retrieved context and the LLM explanation are not included in this prepared demo.
            </p>
          )}
        </div>
      </CollapsibleDetails>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue to Graph Refinement →
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
