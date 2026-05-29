import {
  PRESENTATION_DATASET_ORDER,
  factsFor,
  type PresentationDatasetId,
} from "../../lib/omniaPresentationData";

const LABELS: Record<PresentationDatasetId, string> = {
  codexM: "CoDEx-M",
  fb15k237: "FB15K-237",
  wn18rr: "WN18RR",
  covidFact: "COVID-Fact",
};

export function DatasetSelectorCard({
  selected,
  onSelect,
  variant = "cards",
}: {
  selected: PresentationDatasetId;
  onSelect: (id: PresentationDatasetId) => void;
  variant?: "cards" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="space-y-1.5">
        {PRESENTATION_DATASET_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
              selected === id
                ? "border-blue-500 bg-blue-50 font-semibold text-blue-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>{LABELS[id]}</span>
            {id === "covidFact" ? <span className="text-[10px] uppercase text-slate-400">static</span> : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {PRESENTATION_DATASET_ORDER.map((id) => {
        const facts = factsFor(id);
        const isSelected = selected === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{LABELS[id]}</p>
              {id === "covidFact" ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  static
                </span>
              ) : null}
            </div>
            {facts ? (
              <p className="mt-1 text-[11px] text-slate-500">
                {facts.entities.toLocaleString()} entities · {facts.triples.toLocaleString()} triples
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
