import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationGraph } from "../../lib/buildCandidateGraph";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

export type InspectTarget = { type: "node" | "edge" | "candidate"; id: string } | null;

function connectedTriples(
  scenario: PresentationScenario,
  graph: PresentationGraph | null,
  nodeId: string,
  labels?: Map<string, string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (h: string, r: string, t: string) => {
    const key = `${h}|${r}|${t}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(
      `${formatEntityLabel(h, labels?.get(h))} - ${formatRelationLabel(r)} -> ${formatEntityLabel(
        t,
        labels?.get(t),
      )}`,
    );
  };
  for (const edge of graph?.edges ?? []) {
    if (edge.source === nodeId || edge.target === nodeId) push(edge.source, edge.label, edge.target);
    if (out.length >= 6) break;
  }
  for (const edge of [...scenario.guided.edges, ...scenario.overview.edges]) {
    if (edge.source === nodeId || edge.target === nodeId) push(edge.source, edge.relation, edge.target);
    if (out.length >= 6) break;
  }
  return out;
}

function endpointLabel(
  id: string,
  selectedCandidate: PresentationCandidate | null,
  labels?: Map<string, string>,
): string {
  if (selectedCandidate && (id === `tail-${selectedCandidate.id}` || id === `cand-tail-${selectedCandidate.id}`)) {
    return formatEntityLabel(selectedCandidate.tail, labels?.get(selectedCandidate.tail));
  }
  if (id.startsWith("anchor-")) {
    const raw = id.slice("anchor-".length);
    return formatEntityLabel(raw, labels?.get(raw));
  }
  return formatEntityLabel(id, labels?.get(id));
}

export function GraphInspector({
  target,
  scenario,
  graph,
  selectedCandidate,
  onClose,
  generationMode = false,
  explorerLabels,
}: {
  target: InspectTarget;
  scenario: PresentationScenario;
  graph: PresentationGraph | null;
  selectedCandidate: PresentationCandidate | null;
  onClose: () => void;
  generationMode?: boolean;
  explorerLabels?: Map<string, string>;
}) {
  if (!target) return null;

  let title = "";
  let body: React.ReactNode = null;

  if (target.type === "node") {
    const triples = connectedTriples(scenario, graph, target.id, explorerLabels);
    title = "Node";
    body = (
      <div className="space-y-2">
        <Row k="Identifier" v={formatEntityLabel(target.id, explorerLabels?.get(target.id))} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Connected triples</p>
          {triples.length ? (
            <ul className="mt-1 space-y-1 text-sm text-slate-600">
              {triples.map((triple) => (
                <li key={triple}>{triple}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No connected triples in this local view.</p>
          )}
        </div>
      </div>
    );
  } else if (target.type === "edge") {
    const edge = graph?.edges.find((item) => item.id === target.id);
    title = "Relation";
    body = edge ? (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold text-slate-900">{endpointLabel(edge.source, selectedCandidate, explorerLabels)}</span>
          <span className="text-blue-600">-&gt; {formatRelationLabel(edge.label) || "relation"} -&gt;</span>
          <span className="font-semibold text-slate-900">{endpointLabel(edge.target, selectedCandidate, explorerLabels)}</span>
        </div>
        <Row
          k="Status"
          v={
            edge.kind === "proposed"
              ? "Generated candidate"
              : edge.kind === "candidate"
                ? "Proposed relation"
                : edge.kind === "accepted"
                  ? "Accepted"
                  : edge.kind === "rejected"
                    ? "Rejected"
                    : edge.kind === "uncertain"
                      ? "Uncertain"
                      : edge.kind === "corrected"
                        ? "Corrected"
                        : "Known relation"
          }
        />
      </div>
    ) : (
      <p className="text-sm text-slate-500">Relation details are not available.</p>
    );
  } else {
    const candidate = selectedCandidate;
    title = "Candidate";
    body = candidate ? (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold text-slate-900">{formatEntityLabel(candidate.head)}</span>
          <span className="text-blue-600">-&gt; {formatRelationLabel(candidate.relation)} -&gt;</span>
          <span className="font-semibold text-slate-900">{formatEntityLabel(candidate.tail)}</span>
        </div>
        {generationMode ? (
          <p className="text-sm text-rose-600">Generated candidate. Validate it in the next steps.</p>
        ) : (
          <>
            {candidate.distance != null ? <Row k="Structural score" v={candidate.distance.toFixed(3)} /> : null}
            {candidate.filterStatus ? <Row k="Filter status" v={candidate.filterStatus} /> : null}
          </>
        )}
      </div>
    ) : (
      <p className="text-sm text-slate-500">No candidate selected.</p>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Details: {title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close details"
        >
          x
        </button>
      </div>
      <div className="px-4 py-3">{body}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</span>
      <span className="text-sm font-medium text-slate-800">{v}</span>
    </div>
  );
}
