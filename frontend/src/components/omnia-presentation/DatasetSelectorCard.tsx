import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  PRESENTATION_DATASET_ORDER,
  factsFor,
  type PresentationDatasetId,
} from "../../lib/omniaPresentationData";

const LABELS: Record<PresentationDatasetId, string> = {
  codexM: "CoDEx-M",
  fb15k237: "FB15K-237",
  wn18rr: "WN18RR",
  covidFact: "COVID-Fact static",
};

function CompactDatasetDropdown({
  selected,
  onSelect,
}: {
  selected: PresentationDatasetId;
  onSelect: (id: PresentationDatasetId) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleSelect = (id: PresentationDatasetId) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-900 transition hover:border-blue-600"
      >
        <span className="min-w-0 truncate">{LABELS[selected]}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-blue-700 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Choose dataset"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {PRESENTATION_DATASET_ORDER.map((id) => (
            <li key={id} role="option" aria-selected={selected === id}>
              <button
                type="button"
                onClick={() => handleSelect(id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                  selected === id
                    ? "bg-blue-50 font-semibold text-blue-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{LABELS[id]}</span>
                {id === "covidFact" ? (
                  <span className="text-[10px] uppercase text-slate-400">static</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

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
    return <CompactDatasetDropdown selected={selected} onSelect={onSelect} />;
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{LABELS[id]}</p>
              {id === "covidFact" ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  static
                </span>
              ) : null}
            </div>
            {facts ? (
              <p className="mt-1 text-[11px] text-slate-500">
                {facts.entities.toLocaleString()} entities / {facts.triples.toLocaleString()} triples
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
