import { useState } from "react";
import { formatEntityLabel } from "../../lib/formatKgLabel";
import type { PresentationScenario } from "../../lib/omniaPresentationData";

export type GraphMode = "guided" | "explore";

function useNodeSearch(
  scenario: PresentationScenario | null,
  onFocusNode: (id: string) => void,
) {
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

  return { query, setQuery, runSearch };
}

/** Compact horizontal toolbar for graph screens — sits above InteractiveGraph. */
export function GraphToolbar({
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
  const { query, setQuery, runSearch } = useNodeSearch(scenario, onFocusNode);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
        {(["guided", "explore"] as GraphMode[]).map((graphMode) => (
          <button
            key={graphMode}
            type="button"
            onClick={() => onModeChange(graphMode)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
              mode === graphMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {graphMode}
          </button>
        ))}
      </div>

      <div className="flex min-w-[140px] flex-1 items-center gap-1.5 sm:max-w-xs">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && runSearch()}
          placeholder="Search node…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={runSearch}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Find
        </button>
      </div>

      <button
        type="button"
        onClick={onFit}
        className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        Fit view
      </button>
    </div>
  );
}
