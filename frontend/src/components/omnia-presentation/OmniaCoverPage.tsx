export function OmniaCoverPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="omnia-presentation min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-4 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Conference Demo
        </span>
        <h1 className="text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl">OMNIA+</h1>
        <p className="mt-4 text-xl font-medium text-slate-700">Interactive Knowledge Graph Completion System</p>
        <p className="mt-2 text-sm text-slate-500">Powered by graph embeddings and LLM validation.</p>

        <div className="mt-10 flex aspect-[16/7] w-full max-w-2xl items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60">
          <span className="text-sm font-medium text-slate-400">Demo image placeholder</span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-10 rounded-xl bg-slate-900 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Start Knowledge Completion
        </button>
      </div>
    </div>
  );
}
