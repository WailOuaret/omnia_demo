import { useId } from "react";
import type {
  PGraphEdge,
  PGraphEdgeKind,
  PGraphNode,
  PresentationGraph,
} from "../../lib/buildCandidateGraph";

const EDGE_COLOR: Record<PGraphEdgeKind, string> = {
  known: "#64748b",
  candidate: "#2563eb",
  proposed: "#dc2626",
  accepted: "#16a34a",
  rejected: "#dc2626",
  uncertain: "#d97706",
  corrected: "#7c3aed",
};

const NODE_STYLE: Record<PGraphNode["kind"], { fill: string; stroke: string; text: string }> = {
  tail: { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
  member: { fill: "#ffffff", stroke: "#94a3b8", text: "#1e293b" },
  candidateTail: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
  head: { fill: "#0f172a", stroke: "#0f172a", text: "#ffffff" },
  context: { fill: "#f1f5f9", stroke: "#cbd5e1", text: "#475569" },
};

function nodeWidth(label: string): number {
  return Math.max(54, Math.min(150, 16 + label.length * 7.4));
}
const NODE_H = 30;

function EdgeLine({
  edge,
  from,
  to,
  markerId,
}: {
  edge: PGraphEdge;
  from: PGraphNode;
  to: PGraphNode;
  markerId: string;
}) {
  const color = EDGE_COLOR[edge.kind];
  const dashed = edge.kind === "candidate" || edge.kind === "rejected";
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Trim the line so the arrowhead lands on the node border, not its centre.
  const pad = NODE_H / 2 + 8;
  const x2 = to.x - (dx / len) * pad;
  const y2 = to.y - (dy / len) * pad;
  const x1 = from.x + (dx / len) * (nodeWidth(from.label) / 2);
  const y1 = from.y + (dy / len) * (NODE_H / 2);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={edge.highlight ? 2.6 : 1.6}
        strokeDasharray={dashed ? "6 5" : undefined}
        markerEnd={`url(#${markerId})`}
        opacity={edge.kind === "known" ? 0.7 : 1}
      />
      {edge.label ? (
        <g>
          <rect x={mx - edge.label.length * 3.4 - 4} y={my - 9} width={edge.label.length * 6.8 + 8} height={16} rx={4} fill="#ffffff" opacity={0.92} />
          <text x={mx} y={my + 3} textAnchor="middle" fontSize={11} fill={color} fontWeight={600}>
            {edge.label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

export function GraphPreviewCard({
  graph,
  title,
  emptyMessage,
  height = 360,
}: {
  graph: PresentationGraph | null;
  title?: string;
  emptyMessage?: string;
  height?: number;
}) {
  const rawId = useId().replace(/:/g, "");
  const nodeById = new Map(graph?.nodes.map((n) => [n.id, n]) ?? []);

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
        {title ? <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p> : null}
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500" style={{ minHeight: height }}>
          {emptyMessage ?? "No graph available for this view."}
        </div>
      </div>
    );
  }

  const usedKinds = Array.from(new Set(graph.edges.map((e) => e.kind)));

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      {title ? (
        <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      ) : null}
      <svg
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        width="100%"
        style={{ height, display: "block" }}
        role="img"
        aria-label={title ?? "Knowledge graph preview"}
      >
        <defs>
          {usedKinds.map((kind) => (
            <marker
              key={kind}
              id={`arrow-${rawId}-${kind}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR[kind]} />
            </marker>
          ))}
        </defs>

        {graph.edges.map((edge) => {
          const from = nodeById.get(edge.source);
          const to = nodeById.get(edge.target);
          if (!from || !to) return null;
          return (
            <EdgeLine
              key={edge.id}
              edge={edge}
              from={from}
              to={to}
              markerId={`arrow-${rawId}-${edge.kind}`}
            />
          );
        })}

        {graph.nodes.map((node) => {
          const style = NODE_STYLE[node.kind];
          const w = nodeWidth(node.label);
          return (
            <g key={node.id}>
              <rect
                x={node.x - w / 2}
                y={node.y - NODE_H / 2}
                width={w}
                height={NODE_H}
                rx={8}
                fill={style.fill}
                stroke={node.highlight ? "#2563eb" : style.stroke}
                strokeWidth={node.highlight ? 2.4 : 1.4}
              />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={style.text}>
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
        {graph.caption ? <span className="font-medium text-slate-600">{graph.caption}</span> : null}
        <span className="ml-auto flex items-center gap-3">
          <Legend color="#64748b" label="Known" />
          <Legend color="#2563eb" dashed label="Proposed" />
          <Legend color="#16a34a" label="Accepted" />
          <Legend color="#dc2626" dashed label="Rejected" />
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="20" height="8">
        <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2.4" strokeDasharray={dashed ? "5 4" : undefined} />
      </svg>
      {label}
    </span>
  );
}
