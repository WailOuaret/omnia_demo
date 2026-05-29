import { InteractiveGraph } from "./InteractiveGraph";
import { GraphToolbar } from "./GraphNavPanel";
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

function verdictMeta(decision: string | null | undefined) {
  switch (decision) {
    case "valid":
      return { label: "Validated", cls: "border-emerald-200 bg-emerald-50 text-emerald-800", edge: "accepted" as const };
    case "invalid":
      return { label: "Rejected", cls: "border-rose-200 bg-rose-50 text-rose-800", edge: "rejected" as const };
    case "uncertain":
      return { label: "Uncertain", cls: "border-amber-200 bg-amber-50 text-amber-900", edge: "uncertain" as const };
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
  const hasCandidateLlmOutput = Boolean(
    selectedCandidate?.llmDecision ||
      selectedCandidate?.llmScore != null ||
      selectedCandidate?.llmRationale ||
      selectedCandidate?.retrievedContext.length,
  );
  const isRealLlm = metrics.llmAvailable && hasCandidateLlmOutput;
  const isPreparedExample =
    !isRealLlm &&
    Boolean(
      selectedCandidate?.llmRationale ||
        selectedCandidate?.llmDecision ||
        selectedCandidate?.whyGenerated,
    );
  const hasLlmOutput = isRealLlm || isPreparedExample;
  const verdict = hasLlmOutput ? verdictMeta(selectedCandidate?.llmDecision) : null;
  const edgeKind = verdict?.edge ?? "candidate";
  const graph =
    gi.mode === "explore"
      ? buildNeighbourhoodGraph(scenario, selectedCandidate, edgeKind)
      : buildValidationGraph(selectedCandidate, edgeKind);

  const validatedTotal =
    (metrics.llmAccepted ?? 0) + (metrics.llmRejected ?? 0) + (metrics.llmUnresolved ?? 0);

  const metricCards: MetricItem[] = isRealLlm
    ? [
        { label: "Structurally validated", value: fmt(metrics.filteringAccepted) },
        { label: "LLM validated", value: fmt(validatedTotal), tone: "green" },
      ]
    : [];

  return (
    <div className="space-y-4">
      {metricCards.length > 0 ? <SummaryMetricCards items={metricCards} /> : null}

      {!hasLlmOutput ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          LLM validation output is not included for this prepared sample. This screen shows where semantic
          validation fits in the OMNIA workflow.
        </div>
      ) : null}

      {!selectedCandidate ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No candidate is selected for this dataset, so there is nothing to validate semantically here.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                {gi.mode === "explore" ? "Local neighbourhood. Click nodes and edges." : "Candidate relation in local context."}
              </p>
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
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Selected candidate</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-semibold text-slate-900">{formatEntityLabel(selectedCandidate.head)}</span>
                <span className="text-blue-600">-&gt; {formatRelationLabel(selectedCandidate.relation)} -&gt;</span>
                <span className="font-semibold text-slate-900">{formatEntityLabel(selectedCandidate.tail)}</span>
              </div>
            </div>

            {hasLlmOutput && verdict ? (
              <>
                {isPreparedExample ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                    Prepared semantic validation example
                  </p>
                ) : null}
                <div className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${verdict.cls}`}>
                  {verdict.label}
                </div>
                {selectedCandidate.llmRationale ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                    {selectedCandidate.llmRationale}
                  </p>
                ) : selectedCandidate.whyGenerated ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                    {selectedCandidate.whyGenerated}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      )}

      <CollapsibleDetails label="Show validation context">
        {hasLlmOutput && (isRealLlm || isPreparedExample) ? (
          <div className="space-y-2 text-sm">
            {selectedCandidate?.retrievedContext.length ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-500">Retrieved evidence</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                  {selectedCandidate.retrievedContext.slice(0, 4).map((context, index) => (
                    <li key={`${context}-${index}`} className="font-mono">
                      {context.replace(/\n/g, " / ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selectedCandidate?.llmRationale ? <Detail k="LLM explanation" v={selectedCandidate.llmRationale} /> : null}
            {verdict ? <Detail k="Verdict" v={verdict.label} /> : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            LLM validation output is not included for this prepared sample.
          </p>
        )}
      </CollapsibleDetails>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue to Graph Refinement
        </button>
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{k}</p>
      <p className="mt-1 text-sm text-slate-700">{v}</p>
    </div>
  );
}
