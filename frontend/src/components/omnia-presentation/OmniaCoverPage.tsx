import { CollapsibleDetails } from "./CollapsibleDetails";

export function OmniaCoverPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="omnia-presentation min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl">OMNIA+</h1>
        <p className="mt-4 text-xl font-medium text-slate-700">
          Interactive Knowledge Graph Completion System
        </p>
        <p className="mt-2 text-sm text-slate-500">Powered by graph embeddings and LLM validation.</p>

        <button
          type="button"
          onClick={onStart}
          className="mt-10 rounded-xl bg-slate-900 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Start Knowledge Completion
        </button>

        <div className="mt-10 w-full max-w-xl">
          <CollapsibleDetails label="About the system architecture">
            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img
                src={`${import.meta.env.BASE_URL}omnia-demo-cover.svg`}
                alt="OMNIA-Demo architecture for knowledge graph completion and validation"
                className="h-auto w-full"
              />
            </figure>
          </CollapsibleDetails>
        </div>
      </div>
    </div>
  );
}
