import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getStraightPath,
  useInternalNode,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type {
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

const NODE_STYLE: Record<PGraphNode["kind"], { bg: string; border: string; text: string }> = {
  tail: { bg: "#fef3c7", border: "#d97706", text: "#92400e" },
  member: { bg: "#ffffff", border: "#94a3b8", text: "#1e293b" },
  candidateTail: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a" },
  head: { bg: "#0f172a", border: "#0f172a", text: "#ffffff" },
  context: { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" },
};

type KgNodeData = {
  label: string;
  subLabel?: string;
  kind: PGraphNode["kind"];
  highlight?: boolean;
  selected?: boolean;
};

function KgNode({ data }: NodeProps) {
  const d = data as KgNodeData;
  const style = NODE_STYLE[d.kind];
  const ring = d.selected ? "0 0 0 3px rgba(37,99,235,0.35)" : undefined;
  return (
    <div
      style={{
        background: style.bg,
        border: `${d.highlight || d.selected ? 2.4 : 1.4}px solid ${d.highlight || d.selected ? "#2563eb" : style.border}`,
        color: style.text,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 600,
        textAlign: "center",
        lineHeight: 1.25,
        boxShadow: ring,
        cursor: "pointer",
        maxWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div>{d.label}</div>
      {d.subLabel ? (
        <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.65, marginTop: 2 }}>{d.subLabel}</div>
      ) : null}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

function center(node: ReturnType<typeof useInternalNode>) {
  if (!node) return null;
  const w = node.measured?.width ?? 90;
  const h = node.measured?.height ?? 32;
  return {
    x: node.internals.positionAbsolute.x + w / 2,
    y: node.internals.positionAbsolute.y + h / 2,
    w,
    h,
  };
}

// Intersection of the centre-to-centre line with the source rectangle border.
function borderPoint(self: { x: number; y: number; w: number; h: number }, other: { x: number; y: number }) {
  const dx = other.x - self.x;
  const dy = other.y - self.y;
  if (dx === 0 && dy === 0) return { x: self.x, y: self.y };
  const halfW = self.w / 2 + 4;
  const halfH = self.h / 2 + 4;
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: self.x + dx * scale, y: self.y + dy * scale };
}

function FloatingEdge({ id, source, target, markerEnd, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const s = center(sourceNode);
  const t = center(targetNode);
  if (!s || !t) return null;

  const sp = borderPoint(s, t);
  const tp = borderPoint(t, s);
  const [path] = getStraightPath({ sourceX: sp.x, sourceY: sp.y, targetX: tp.x, targetY: tp.y });

  const kind = (data?.kind as PGraphEdgeKind) ?? "known";
  const highlight = Boolean(data?.highlight);
  const color = EDGE_COLOR[kind];
  const dashed =
    kind === "candidate" ||
    kind === "proposed" ||
    kind === "accepted" ||
    kind === "rejected" ||
    kind === "uncertain" ||
    kind === "corrected";
  const label = data?.label as string | undefined;
  const mx = (sp.x + tp.x) / 2;
  const my = (sp.y + tp.y) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: highlight ? 2.8 : 1.6,
          strokeDasharray: dashed ? "6 5" : undefined,
          opacity: kind === "known" ? 0.75 : 1,
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${mx}px, ${my}px)`,
              background: "#ffffff",
              padding: "1px 5px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color,
              pointerEvents: "none",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes = { kg: KgNode };
const edgeTypes = { floating: FloatingEdge };

function toFlowNodes(graph: PresentationGraph, selectedNodeId: string | null): Node[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: "kg",
    position: { x: n.x, y: n.y },
    data: {
      label: n.label,
      subLabel: n.subLabel,
      kind: n.kind,
      highlight: n.highlight,
      selected: n.id === selectedNodeId,
    },
    draggable: true,
  }));
}

function toFlowEdges(graph: PresentationGraph, selectedEdgeId: string | null, hoveredEdgeId: string | null): Edge[] {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "floating",
    markerEnd: { type: "arrowclosed" as const, color: EDGE_COLOR[e.kind], width: 16, height: 16 },
    data: {
      kind: e.kind,
      label: e.highlight || e.id === selectedEdgeId || e.id === hoveredEdgeId ? e.label : undefined,
      highlight: e.highlight || e.id === selectedEdgeId || e.id === hoveredEdgeId,
    },
  }));
}

function GraphInner({
  graph,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  fitKey,
}: {
  graph: PresentationGraph;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onNodeClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onPaneClick: () => void;
  fitKey: number;
}) {
  const rf = useReactFlow();
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const nodes = useMemo(() => toFlowNodes(graph, selectedNodeId), [graph, selectedNodeId]);
  const edges = useMemo(
    () => toFlowEdges(graph, selectedEdgeId, hoveredEdgeId),
    [graph, selectedEdgeId, hoveredEdgeId],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 60);
    return () => window.clearTimeout(handle);
    // Re-fit when the graph identity or an explicit fit request changes.
  }, [rf, graph, fitKey]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_, node) => onNodeClick(node.id)}
      onEdgeClick={(_, edge) => onEdgeClick(edge.id)}
      onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
      onEdgeMouseLeave={() => setHoveredEdgeId(null)}
      onPaneClick={onPaneClick}
      nodesConnectable={false}
      edgesFocusable
    >
      <Background color="#e2e8f0" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export function InteractiveGraph({
  graph,
  title,
  emptyMessage,
  height = 360,
  selectedNodeId = null,
  selectedEdgeId = null,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  fitKey = 0,
}: {
  graph: PresentationGraph | null;
  title?: string;
  emptyMessage?: string;
  height?: number;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  onNodeClick?: (id: string) => void;
  onEdgeClick?: (id: string) => void;
  onPaneClick?: () => void;
  fitKey?: number;
}) {
  const usedKinds = Array.from(new Set(graph?.edges.map((e) => e.kind) ?? []));

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      {title ? (
        <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      ) : null}
      {!graph || graph.nodes.length === 0 ? (
        <div
          className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500"
          style={{ minHeight: height }}
        >
          {emptyMessage ?? "No graph available for this view."}
        </div>
      ) : (
        <div style={{ height }} className="omnia-flow">
          <ReactFlowProvider>
            <GraphInner
              graph={graph}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onNodeClick={onNodeClick ?? (() => {})}
              onEdgeClick={onEdgeClick ?? (() => {})}
              onPaneClick={onPaneClick ?? (() => {})}
              fitKey={fitKey}
            />
          </ReactFlowProvider>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
        {graph?.caption ? <span className="font-medium text-slate-600">{graph.caption}</span> : null}
        <span className="ml-auto flex items-center gap-3">
          {usedKinds.includes("known") ? <Legend color="#64748b" label="Known" /> : null}
          {usedKinds.includes("proposed") ? <Legend color="#dc2626" dashed label="Generated candidate" /> : null}
          {usedKinds.includes("candidate") ? <Legend color="#2563eb" dashed label="Proposed" /> : null}
          {usedKinds.includes("accepted") ? <Legend color="#16a34a" label="Accepted" /> : null}
          {usedKinds.includes("rejected") ? <Legend color="#dc2626" dashed label="Rejected" /> : null}
          {usedKinds.includes("uncertain") ? <Legend color="#d97706" dashed label="Uncertain" /> : null}
          {usedKinds.includes("corrected") ? <Legend color="#7c3aed" label="Corrected" /> : null}
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
