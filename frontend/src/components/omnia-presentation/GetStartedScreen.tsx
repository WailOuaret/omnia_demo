const STEPS = [
  {
    n: 1,
    title: "Select a knowledge graph dataset",
    detail: "Choose a benchmark graph from the demo header once you enter the workflow.",
  },
  {
    n: 2,
    title: "Generate candidate relations",
    detail: "OMNIA proposes missing triples based on graph structure and embeddings.",
  },
  {
    n: 3,
    title: "Validate candidate relations",
    detail: "Structural and semantic checks filter plausible candidates before refinement.",
  },
  {
    n: 4,
    title: "Refine the knowledge graph",
    detail: "Accept or reject validated candidates to update the graph.",
  },
];

export function GetStartedScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="omnia-presentation min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Get Started</h1>
        <p className="mt-2 text-sm text-slate-600">
          Explore missing relations, validate them, and refine the knowledge graph.
        </p>

        <ol className="mt-8 space-y-5">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-4">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700"
              >
                {step.n}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

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
