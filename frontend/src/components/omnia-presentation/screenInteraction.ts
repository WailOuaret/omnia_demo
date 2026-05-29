import type { GraphMode } from "./GraphNavPanel";
import type { InspectTarget } from "./GraphInspector";

// Shared interactive-graph wiring passed from the page into every workflow screen.
export interface GraphInteraction {
  mode: GraphMode;
  setMode: (mode: GraphMode) => void;
  inspect: InspectTarget;
  fitKey: number;
  onFit: () => void;
  onFocusNode: (id: string) => void;
  onNodeClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onPaneClick: () => void;
  onInspectClose: () => void;
}

export type { GraphMode, InspectTarget };
