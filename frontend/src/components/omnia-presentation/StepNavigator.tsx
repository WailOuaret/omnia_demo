export type WorkflowScreen =
  | "candidateGeneration"
  | "structuralValidation"
  | "semanticValidation"
  | "graphRefinement";

export const WORKFLOW_ORDER: WorkflowScreen[] = [
  "candidateGeneration",
  "structuralValidation",
  "semanticValidation",
  "graphRefinement",
];

export const WORKFLOW_LABELS: Record<WorkflowScreen, string> = {
  candidateGeneration: "Candidate Generation",
  structuralValidation: "Structural Validation",
  semanticValidation: "Semantic Validation",
  graphRefinement: "Graph Refinement",
};

export function StepNavigator({
  active,
  onSelect,
}: {
  active: WorkflowScreen;
  onSelect: (screen: WorkflowScreen) => void;
}) {
  return (
    <nav className="space-y-1.5">
      {WORKFLOW_ORDER.map((screen, index) => {
        const isActive = screen === active;
        return (
          <button
            key={screen}
            type="button"
            onClick={() => onSelect(screen)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
              isActive
                ? "border-blue-500 bg-blue-50 font-semibold text-blue-900"
                : "border-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {index + 1}
            </span>
            {WORKFLOW_LABELS[screen]}
          </button>
        );
      })}
    </nav>
  );
}
