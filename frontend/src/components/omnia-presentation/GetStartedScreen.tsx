import { DatasetSelectorCard } from "./DatasetSelectorCard";
import type { PresentationDatasetId } from "../../lib/omniaPresentationData";

const STEPS = [
  {
    n: 1,
    title: "Select a Knowledge Graph",
    body: "Load a graph for exploration and completion.",
  },
  {
    n: 2,
    title: "Generate Candidate Relations",
    body: "Discover potential new relations from graph structure.",
  },
  {
    n: 3,
    title: "Validate Candidate Relations",
    body: "Inspect structural scores and semantic validation outputs.",
  },
  {
    n: 4,
    title: "Refine the Knowledge Graph",
    body: "Accept, reject, or correct relations and update graph content.",
  },
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
      <div className="mx-auto grid max-w-[1120px] gap-8 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div>
            <p className="text-2xl font-bold tracking-tight text-slate-950">OMNIA+</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Knowledge completion
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Step 1
            </p>
            <div className="rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">
              Candidate Generation
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Select KG
            </p>
            <DatasetSelectorCard selected={selectedDataset} onSelect={onDatasetChange} variant="compact" />
          </div>
        </aside>

        <main className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Get Started</h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome to the OMNIA+ knowledge graph completion workflow.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {step.n}
                  </span>
                  <p className="font-semibold text-slate-900">{step.title}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-slate-900 px-8 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
            >
              Continue to Candidate Generation
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
