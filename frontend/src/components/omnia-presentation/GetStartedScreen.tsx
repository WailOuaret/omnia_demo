import { DatasetSelectorCard } from "./DatasetSelectorCard";
import type { PresentationDatasetId } from "../../lib/omniaPresentationData";

const STEPS = [
  { n: 1, title: "Select a knowledge graph dataset" },
  { n: 2, title: "Generate candidate relations" },
  { n: 3, title: "Validate candidate relations" },
  { n: 4, title: "Refine the knowledge graph" },
];

export function GetStartedScreen({
  selectedDataset,
  onDatasetChange,
  onContinue,
}: {
  selectedDataset: PresentationDatasetId;
  onDatasetChange: (id: PresentationDatasetId) => void;
  onContinue: () => void;
}) {
  return (
    <div className="omnia-presentation min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Get Started</h1>
        <p className="mt-2 text-sm text-slate-600">
          Explore missing relations, validate them, and refine the knowledge graph.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div key={step.n} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {step.n}
              </span>
              <p className="pt-1 text-sm font-medium text-slate-800">{step.title}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dataset</p>
          <DatasetSelectorCard selected={selectedDataset} onSelect={onDatasetChange} variant="compact" />
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-slate-900 px-8 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Start demo
          </button>
        </div>
      </div>
    </div>
  );
}
