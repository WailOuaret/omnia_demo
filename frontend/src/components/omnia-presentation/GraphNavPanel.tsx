import { useState } from "react";
import { formatEntityLabel } from "../../lib/formatKgLabel";
import type { PresentationScenario } from "../../lib/omniaPresentationData";

export type GraphMode = "guided" | "explore";

export function GraphNavPanel({
  scenario,
  mode,
  onModeChange,
  onFit,
  onFocusNode,
}: {
  scenario: PresentationScenario | null;
  mode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
  onFit: () => void;
  onFocusNode: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const runSearch = () => {
    if (!scenario || !query.trim()) return;
    const q = query.trim().toLowerCase();
    const pool = [...scenario.guided.nodes, ...scenario.overview.nodes];
    const match =
      pool.find((node) => formatEntityLabel(node.id, node.label).toLowerCase() === q) ??
      pool.find((node) => formatEntityLabel(node.id, node.label).toLowerCase().includes(q)) ??
      pool.find((node) => node.id.toLowerCase().includes(q));
    if (match) onFocusNode(match.id);
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {(["guided", "explore"] as GraphMode[]).map((graphMode) => (
          <button
            key={graphMode}
            type="button"
            onClick={() => onModeChange(graphMode)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition ${
              mode === graphMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {graphMode} view
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && runSearch()}
          placeholder="Search node..."
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={runSearch}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Find
        </button>
      </div>

      <button
        type="button"
        onClick={onFit}
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        Fit / reset view
      </button>
    </div>
  );
}
