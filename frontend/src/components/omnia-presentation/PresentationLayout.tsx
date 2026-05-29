import type { ReactNode } from "react";
import { DatasetSelectorCard } from "./DatasetSelectorCard";
import { WORKFLOW_LABELS, WORKFLOW_ORDER, type WorkflowScreen } from "./StepNavigator";
import type { PresentationDatasetId } from "../../lib/omniaPresentationData";

export function PresentationLayout({
  datasetId,
  onDatasetChange,
  activeScreen,
  onScreenChange,
  onBackToStart,
  title,
  subtitle,
  children,
}: {
  datasetId: PresentationDatasetId;
  onDatasetChange: (id: PresentationDatasetId) => void;
  activeScreen: WorkflowScreen;
  onScreenChange: (screen: WorkflowScreen) => void;
  onBackToStart: () => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const index = WORKFLOW_ORDER.indexOf(activeScreen);
  const canPrev = index > 0;
  const canNext = index < WORKFLOW_ORDER.length - 1;

  return (
    <div className="omnia-presentation min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <button type="button" onClick={onBackToStart} className="flex items-center gap-2 text-left">
            <span className="text-lg font-bold tracking-tight text-slate-900">OMNIA+</span>
            <span className="hidden text-xs text-slate-400 sm:inline">Interactive KG Completion</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <DatasetSelectorCard selected={datasetId} onSelect={onDatasetChange} variant="compact" />
            </div>
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

      <main className="mx-auto max-w-[1280px] space-y-4 px-6 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
