import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { OmniaCoverPage } from "../components/omnia-presentation/OmniaCoverPage";
import { GetStartedScreen } from "../components/omnia-presentation/GetStartedScreen";
import { PresentationLayout } from "../components/omnia-presentation/PresentationLayout";
import { CandidateGenerationScreen } from "../components/omnia-presentation/CandidateGenerationScreen";
import { StructuralValidationScreen } from "../components/omnia-presentation/StructuralValidationScreen";
import { SemanticValidationScreen } from "../components/omnia-presentation/SemanticValidationScreen";
import { GraphRefinementScreen } from "../components/omnia-presentation/GraphRefinementScreen";
import { GraphNavPanel, type GraphMode } from "../components/omnia-presentation/GraphNavPanel";
import type { GraphInteraction, InspectTarget } from "../components/omnia-presentation/screenInteraction";
import {
  WORKFLOW_LABELS,
  WORKFLOW_ORDER,
  type WorkflowScreen,
} from "../components/omnia-presentation/StepNavigator";
import type { RefinementDecision } from "../lib/buildRefinementGraph";
import {
  loadOmniaCandidateExplorer,
  resolvePresentationCandidate,
  type OmniaCandidateExplorer,
} from "../lib/omniaCandidateExplorer";
import {
  loadPresentationScenario,
  PRESENTATION_DATASET_ORDER,
  type PresentationDatasetId,
  type PresentationScenario,
} from "../lib/omniaPresentationData";

type Decision = Exclude<RefinementDecision, "none">;

type Screen = "cover" | "getStarted" | WorkflowScreen;

const SCREEN_SUBTITLE: Record<WorkflowScreen, string> = {
  candidateGeneration:
    "OMNIA proposes candidate relations that may be missing from the selected knowledge graph.",
  structuralValidation: "OMNIA keeps candidates that fit the graph structure and removes weak ones.",
  semanticValidation: "The LLM checks whether the proposed relation makes sense.",
  graphRefinement: "Accepted relations are added to the graph; rejected relations are left out.",
};

function isDatasetId(value: string | null): value is PresentationDatasetId {
  return value != null && (PRESENTATION_DATASET_ORDER as string[]).includes(value);
}

function isWorkflowScreen(value: string | null): value is WorkflowScreen {
  return value != null && (WORKFLOW_ORDER as string[]).includes(value);
}

export function OmniaPresentationDemo() {
  const [searchParams] = useSearchParams();

  const initialDataset = isDatasetId(searchParams.get("dataset"))
    ? (searchParams.get("dataset") as PresentationDatasetId)
    : "codexM";

  const initialScreen: Screen = (() => {
    const screenParam = searchParams.get("screen");
    if (screenParam === "getStarted") return "getStarted";
    if (isWorkflowScreen(screenParam)) return screenParam;
    if (searchParams.get("skipIntro") === "true") return "getStarted";
    return "cover";
  })();

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [datasetId, setDatasetId] = useState<PresentationDatasetId>(initialDataset);
  const [scenario, setScenario] = useState<PresentationScenario | null>(null);
  const [explorer, setExplorer] = useState<OmniaCandidateExplorer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  // Interactive-graph state.
  const [graphMode, setGraphMode] = useState<GraphMode>("guided");
  const [inspect, setInspect] = useState<InspectTarget>(null);
  const [fitKey, setFitKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setScenario(null);
    setExplorer(null);
    setLoadError(null);
    Promise.all([loadPresentationScenario(datasetId), loadOmniaCandidateExplorer(datasetId)])
      .then(([data, ex]) => {
        if (cancelled) return;
        setScenario(data);
        setExplorer(ex);
        const defaultId =
          data.selectedCandidateId ??
          ex.sliceCandidates[0]?.id ??
          data.candidates[0]?.id ??
          null;
        setSelectedCandidateId(defaultId);
        setDecisions({});
        setGraphMode("guided");
        setInspect(null);
        setFitKey((k) => k + 1);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  // Each step starts clean in guided view with no inspector open.
  useEffect(() => {
    setGraphMode("guided");
    setInspect(null);
    setFitKey((k) => k + 1);
  }, [screen]);

  const selectedCandidate = useMemo(
    () =>
      scenario
        ? resolvePresentationCandidate(scenario.candidates, explorer, selectedCandidateId)
        : null,
    [scenario, explorer, selectedCandidateId],
  );

  const acceptedCount = useMemo(
    () => Object.values(decisions).filter((d) => d === "accepted").length,
    [decisions],
  );
  const rejectedCount = useMemo(
    () => Object.values(decisions).filter((d) => d === "rejected").length,
    [decisions],
  );

  const onDatasetChange = useCallback((id: PresentationDatasetId) => {
    setDatasetId(id);
  }, []);

  const onSelectCandidate = useCallback((id: string) => {
    setSelectedCandidateId(id);
    setInspect({ type: "candidate", id });
  }, []);

  const goToWorkflow = useCallback(
    (next: WorkflowScreen) => {
      const idx = WORKFLOW_ORDER.indexOf(next);
      if (idx >= 0) setScreen(next);
    },
    [],
  );

  const advance = useCallback(() => {
    if (!isWorkflowScreen(screen)) {
      setScreen("candidateGeneration");
      return;
    }
    const idx = WORKFLOW_ORDER.indexOf(screen);
    if (idx < WORKFLOW_ORDER.length - 1) setScreen(WORKFLOW_ORDER[idx + 1]);
  }, [screen]);

  const gi: GraphInteraction = useMemo(
    () => ({
      mode: graphMode,
      setMode: (mode) => {
        setGraphMode(mode);
        setFitKey((k) => k + 1);
      },
      inspect,
      fitKey,
      onNodeClick: (id) => setInspect({ type: "node", id }),
      onEdgeClick: (id) => setInspect({ type: "edge", id }),
      onPaneClick: () => setInspect(null),
      onInspectClose: () => setInspect(null),
    }),
    [graphMode, inspect, fitKey],
  );

  if (screen === "cover") {
    return <OmniaCoverPage onStart={() => setScreen("getStarted")} />;
  }

  if (screen === "getStarted") {
    return (
      <GetStartedScreen
        selectedDataset={datasetId}
        onDatasetChange={onDatasetChange}
        onContinue={() => setScreen("candidateGeneration")}
      />
    );
  }

  // Workflow screens share the guided layout.
  const activeScreen: WorkflowScreen = screen;

  const graphNav = (
    <GraphNavPanel
      scenario={scenario}
      mode={graphMode}
      hideClusterHint={activeScreen === "candidateGeneration"}
      onModeChange={(mode) => {
        setGraphMode(mode);
        setFitKey((k) => k + 1);
      }}
      onFit={() => setFitKey((k) => k + 1)}
      onFocusNode={(id) => {
        setGraphMode("explore");
        setInspect({ type: "node", id });
        setFitKey((k) => k + 1);
      }}
    />
  );

  if (loadError) {
    return (
      <PresentationShell
        datasetId={datasetId}
        activeScreen={activeScreen}
        onDatasetChange={onDatasetChange}
        onScreenChange={goToWorkflow}
        onBackToStart={() => setScreen("getStarted")}
        datasetLabel={datasetId}
      >
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Could not load the prepared demo data: {loadError}
          <p className="mt-2 text-xs text-rose-600">
            Run <code className="font-mono">python scripts/build_presentation_data.py</code> so that
            <code className="font-mono"> frontend/public/omnia-presentation/</code> is populated.
          </p>
        </div>
      </PresentationShell>
    );
  }

  if (!scenario) {
    return (
      <PresentationShell
        datasetId={datasetId}
        activeScreen={activeScreen}
        onDatasetChange={onDatasetChange}
        onScreenChange={goToWorkflow}
        onBackToStart={() => setScreen("getStarted")}
        datasetLabel={datasetId}
      >
        <p className="text-sm text-slate-500">Loading prepared demo…</p>
      </PresentationShell>
    );
  }

  return (
    <PresentationLayout
      datasetLabel={scenario.label}
      datasetId={datasetId}
      onDatasetChange={onDatasetChange}
      activeScreen={activeScreen}
      onScreenChange={goToWorkflow}
      onBackToStart={() => setScreen("getStarted")}
      title={WORKFLOW_LABELS[activeScreen]}
      subtitle={SCREEN_SUBTITLE[activeScreen]}
      graphNav={graphNav}
    >
      {activeScreen === "candidateGeneration" ? (
        <CandidateGenerationScreen
          scenario={scenario}
          explorer={explorer}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={onSelectCandidate}
          onContinue={advance}
          gi={gi}
        />
      ) : null}
      {activeScreen === "structuralValidation" ? (
        <StructuralValidationScreen scenario={scenario} selectedCandidate={selectedCandidate} onContinue={advance} gi={gi} />
      ) : null}
      {activeScreen === "semanticValidation" ? (
        <SemanticValidationScreen scenario={scenario} selectedCandidate={selectedCandidate} onContinue={advance} gi={gi} />
      ) : null}
      {activeScreen === "graphRefinement" ? (
        <GraphRefinementScreen
          scenario={scenario}
          selectedCandidate={selectedCandidate}
          decision={selectedCandidate ? decisions[selectedCandidate.id] ?? "none" : "none"}
          acceptedCount={acceptedCount}
          rejectedCount={rejectedCount}
          onDecide={(decision) =>
            selectedCandidate &&
            setDecisions((prev) => ({ ...prev, [selectedCandidate.id]: decision }))
          }
          onResetFeedback={() =>
            selectedCandidate &&
            setDecisions((prev) => {
              const next = { ...prev };
              delete next[selectedCandidate.id];
              return next;
            })
          }
          onSelectCandidate={onSelectCandidate}
          onRestart={() => {
            setDecisions({});
            setScreen("cover");
          }}
          gi={gi}
        />
      ) : null}
    </PresentationLayout>
  );
}

// Layout shell reused for loading / error states so the chrome stays consistent.
function PresentationShell({
  datasetId,
  datasetLabel,
  activeScreen,
  onDatasetChange,
  onScreenChange,
  onBackToStart,
  children,
}: {
  datasetId: PresentationDatasetId;
  datasetLabel: string;
  activeScreen: WorkflowScreen;
  onDatasetChange: (id: PresentationDatasetId) => void;
  onScreenChange: (screen: WorkflowScreen) => void;
  onBackToStart: () => void;
  children: React.ReactNode;
}) {
  return (
    <PresentationLayout
      datasetLabel={datasetLabel}
      datasetId={datasetId}
      onDatasetChange={onDatasetChange}
      activeScreen={activeScreen}
      onScreenChange={onScreenChange}
      onBackToStart={onBackToStart}
      title={WORKFLOW_LABELS[activeScreen]}
      subtitle={SCREEN_SUBTITLE[activeScreen]}
    >
      {children}
    </PresentationLayout>
  );
}
