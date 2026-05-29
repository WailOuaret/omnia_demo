import { DatasetSelectorCard } from "./DatasetSelectorCard";
import { CollapsibleDetails } from "./CollapsibleDetails";
import {
  DATASET_FACTS,
  OMNIA_PAPER_RESULTS,
  type PresentationDatasetId,
} from "../../lib/omniaPresentationData";

const STEPS = [
  {
    n: 1,
    title: "Select a Knowledge Graph",
    body: "Load a graph for exploration and completion.",
  },
  {
    n: 2,
    title: "Generate Candidate Relations",
    body: "Discover potential missing relations from graph structure.",
  },
  {
    n: 3,
    title: "Validate Candidate Relations",
    body: "Inspect structural scores and semantic validation outputs.",
  },
  {
    n: 4,
    title: "Refine the Knowledge Graph",
    body: "Accept or reject relations and update graph content.",
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
      <div className="mx-auto max-w-4xl px-6 py-12">
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

        <div className="mt-10">
          <p className="mb-3 text-sm font-semibold text-slate-900">Choose a dataset</p>
          <DatasetSelectorCard selected={selectedDataset} onSelect={onDatasetChange} variant="cards" />
        </div>

        <div className="mt-8 space-y-3">
          <CollapsibleDetails label="Dataset information">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-1 pr-4 font-medium">Dataset</th>
                    <th className="py-1 pr-4 font-medium">Relations</th>
                    <th className="py-1 pr-4 font-medium">Entities</th>
                    <th className="py-1 pr-4 font-medium">Triples</th>
                    <th className="py-1 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {DATASET_FACTS.map((f) => (
                    <tr key={f.id} className="border-t border-slate-100">
                      <td className="py-1.5 pr-4 font-semibold">
                        {f.label}
                        {f.publicStatus === "private" ? (
                          <span className="ml-1 rounded bg-slate-200 px-1 text-[9px] uppercase">private</span>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-4">{f.relations.toLocaleString()}</td>
                      <td className="py-1.5 pr-4">{f.entities.toLocaleString()}</td>
                      <td className="py-1.5 pr-4">{f.triples.toLocaleString()}</td>
                      <td className="py-1.5 text-slate-500">{f.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleDetails>

          <CollapsibleDetails label="About OMNIA results">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-slate-800">RAG validation F1 (OMNIA paper)</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {OMNIA_PAPER_RESULTS.ragF1.map((r) => (
                    <span key={r.dataset} className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                      {r.dataset}: {r.f1.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Improves over baselines: {OMNIA_PAPER_RESULTS.baselines.join(", ")}.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                {OMNIA_PAPER_RESULTS.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </CollapsibleDetails>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-slate-900 px-8 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
