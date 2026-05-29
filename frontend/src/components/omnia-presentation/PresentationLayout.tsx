import type { ReactNode } from "react";
import { DatasetSelectorCard } from "./DatasetSelectorCard";
import { StepNavigator, WORKFLOW_LABELS, WORKFLOW_ORDER, type WorkflowScreen } from "./StepNavigator";
import type { PresentationDatasetId } from "../../lib/omniaPresentationData";

export function PresentationLayout({
  datasetLabel,
  datasetId,
  onDatasetChange,
  activeScreen,
  onScreenChange,
  onBackToStart,
  title,
  subtitle,
  graphNav,
  children,
}: {
  datasetLabel: string;
  datasetId: PresentationDatasetId;
  onDatasetChange: (id: PresentationDatasetId) => void;
  activeScreen: WorkflowScreen;
  onScreenChange: (screen: WorkflowScreen) => void;
  onBackToStart: () => void;
  title: string;
  subtitle: string;
  graphNav?: ReactNode;
  children: ReactNode;
}) {
  const index = WORKFLOW_ORDER.indexOf(activeScreen);
  const canPrev = index > 0;
  const canNext = index < WORKFLOW_ORDER.length - 1;

  return (
    <div className="omnia-presentation min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3">
          <button type="button" onClick={onBackToStart} className="flex items-center gap-2 text-left">
            <span className="text-lg font-bold tracking-tight text-slate-900">OMNIA+</span>
            <span className="hidden text-xs text-slate-400 sm:inline">Interactive KG Completion</span>
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {datasetLabel}
            </span>
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => canPrev && onScreenChange(WORKFLOW_ORDER[index - 1])}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => canNext && onScreenChange(WORKFLOW_ORDER[index + 1])}
              className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {canNext ? `Next: ${WORKFLOW_LABELS[WORKFLOW_ORDER[index + 1]]}` : "Next"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dataset</p>
            <DatasetSelectorCard selected={datasetId} onSelect={onDatasetChange} variant="compact" />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Workflow</p>
            <StepNavigator active={activeScreen} onSelect={onScreenChange} />
          </div>
          {graphNav ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Graph</p>
              {graphNav}
            </div>
          ) : null}
        </aside>

        <main className="min-w-0 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
