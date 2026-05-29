export function OmniaCoverPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="omnia-presentation min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-10 text-center">
        <h1 className="text-6xl font-bold tracking-tight text-slate-950 sm:text-7xl">OMNIA+</h1>
        <p className="mt-4 text-xl font-medium text-slate-700">
          Interactive Knowledge Graph Completion System
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 rounded-xl bg-slate-900 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Start Knowledge Completion
        </button>

        <p className="mt-4 text-sm text-slate-500">Powered by Embeddings + LLM Validation</p>

        <figure className="mt-8 w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <img
            src={`${import.meta.env.BASE_URL}omnia-demo-cover.svg`}
            alt="OMNIA knowledge graph completion workflow illustration"
            className="h-auto w-full"
          />
        </figure>
      </div>
    </div>
  );
}
