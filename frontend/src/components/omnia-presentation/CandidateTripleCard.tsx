import { formatEntityLabel, formatRelationLabel } from "../../lib/formatKgLabel";
import type { PresentationCandidate } from "../../lib/omniaPresentationData";

function statusBadge(candidate: PresentationCandidate): { label: string; cls: string } | null {
  const status = (candidate.filterStatus || "").toLowerCase();
  if (status.includes("accept") || status === "kept") {
    return { label: "Passed", cls: "bg-emerald-100 text-emerald-700" };
  }
  if (status.includes("reject") || status.includes("removed") || status.includes("filtered")) {
    return { label: "Removed", cls: "bg-rose-100 text-rose-700" };
  }
  return null;
}

export function CandidateTripleCard({
  candidate,
  selected,
  onSelect,
  compact = false,
  generationMode = false,
}: {
  candidate: PresentationCandidate;
  selected: boolean;
  onSelect: (id: string) => void;
  compact?: boolean;
  generationMode?: boolean;
}) {
  const badge = generationMode || compact ? null : statusBadge(candidate);
  return (
    <button
      type="button"
      onClick={() => onSelect(candidate.id)}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
        selected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-semibold text-slate-900">{formatEntityLabel(candidate.head)}</span>
        <span className="text-blue-600">-&gt; {formatRelationLabel(candidate.relation)} -&gt;</span>
        <span className="font-semibold text-slate-900">{formatEntityLabel(candidate.tail)}</span>
      </div>
      {generationMode ? (
        <p className="mt-1 text-[11px] font-medium text-rose-600">generated candidate</p>
      ) : !compact ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {candidate.distance != null ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
              score {candidate.distance.toFixed(2)}
            </span>
          ) : null}
          {badge ? <span className={`rounded px-1.5 py-0.5 font-medium ${badge.cls}`}>{badge.label}</span> : null}
        </div>
      ) : null}
    </button>
  );
}
