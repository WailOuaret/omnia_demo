import { useState } from "react";
import {
  formatEntityLabel,
  formatRelationLabel,
} from "../../lib/formatKgLabel";
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
      pool.find((n) => formatEntityLabel(n.id, n.label).toLowerCase() === q) ??
      pool.find((n) => formatEntityLabel(n.id, n.label).toLowerCase().includes(q)) ??
      pool.find((n) => n.id.toLowerCase().includes(q));
    if (match) onFocusNode(match.id);
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {(["guided", "explore"] as GraphMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition ${
              mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m} view
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search node…"
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

      {scenario?.cluster.sharedRelation ? (
        <p className="px-0.5 text-[10px] leading-4 text-slate-400">
          Pattern: {formatRelationLabel(scenario.cluster.sharedRelation)} →{" "}
          {formatEntityLabel(scenario.cluster.sharedTail)}
        </p>
      ) : null}
    </div>
  );
}
