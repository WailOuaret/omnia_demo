import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationGraph } from "../../lib/buildCandidateGraph";
import type { PresentationCandidate, PresentationScenario } from "../../lib/omniaPresentationData";

export type InspectTarget = { type: "node" | "edge" | "candidate"; id: string } | null;

function connectedTriples(scenario: PresentationScenario, nodeId: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (h: string, r: string, t: string) => {
    const key = `${h}|${r}|${t}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(`${formatEntityLabel(h)} — ${formatRelationLabel(r)} → ${formatEntityLabel(t)}`);
  };
  for (const e of [...scenario.guided.edges, ...scenario.overview.edges]) {
    if (e.source === nodeId || e.target === nodeId) push(e.source, e.relation, e.target);
    if (out.length >= 6) break;
  }
  return out;
}

export function GraphInspector({
  target,
  scenario,
  graph,
  selectedCandidate,
  onClose,
}: {
  target: InspectTarget;
  scenario: PresentationScenario;
  graph: PresentationGraph | null;
  selectedCandidate: PresentationCandidate | null;
  onClose: () => void;
}) {
  if (!target) return null;

  let title = "";
  let body: React.ReactNode = null;

  if (target.type === "node") {
    const triples = connectedTriples(scenario, target.id);
    title = "Node";
    body = (
      <div className="space-y-2">
        <Row k="Identifier" v={formatEntityLabel(target.id)} mono={formatEntityLabel(target.id) !== target.id ? false : true} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Connected triples</p>
          {triples.length ? (
            <ul className="mt-1 space-y-1 text-sm text-slate-600">
              {triples.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No connected triples in this slice.</p>
          )}
        </div>
      </div>
    );
  } else if (target.type === "edge") {
    const edge = graph?.edges.find((e) => e.id === target.id);
    title = "Relation";
    if (edge) {
      const statusLabel =
        edge.kind === "candidate"
          ? "Proposed candidate"
          : edge.kind === "accepted"
            ? "Accepted"
            : edge.kind === "rejected"
              ? "Rejected"
              : "Known relation";
      body = (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-semibold text-slate-900">{formatEntityLabel(edge.source.replace(/^cand-tail-|^tail-|^anchor-/, ""))}</span>
            <span className="text-blue-600">→ {formatRelationLabel(edge.label) || "relation"} →</span>
            <span className="font-semibold text-slate-900">{formatEntityLabel(edge.target.replace(/^cand-tail-|^tail-|^anchor-/, ""))}</span>
          </div>
          <Row k="Status" v={statusLabel} />
        </div>
      );
    } else {
      body = <p className="text-sm text-slate-500">Relation details are not available.</p>;
    }
  } else {
    const candidate = selectedCandidate;
    title = "Candidate";
    if (candidate) {
      body = (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-semibold text-slate-900">{formatEntityLabel(candidate.head)}</span>
            <span className="text-blue-600">→ {formatRelationLabel(candidate.relation)} →</span>
            <span className="font-semibold text-slate-900">{formatEntityLabel(candidate.tail)}</span>
          </div>
          {candidate.distance != null ? <Row k="Structural score" v={candidate.distance.toFixed(3)} /> : null}
          {candidate.filterStatus ? <Row k="Filter status" v={candidate.filterStatus} /> : null}
          {candidate.whyGenerated ? (
            <p className="text-sm text-slate-600">{candidate.whyGenerated}</p>
          ) : null}
        </div>
      );
    } else {
      body = <p className="text-sm text-slate-500">No candidate selected.</p>;
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Inspector · {title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close inspector"
        >
          ✕
        </button>
      </div>
      <div className="px-4 py-3">{body}</div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</span>
      <span className={`text-sm font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}
