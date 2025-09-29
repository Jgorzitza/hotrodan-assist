import { createContext, useContext, useReducer, type ReactNode } from "react";

export type DrillDownState = {
  source: string;
  target: string;
  data: Record<string, unknown>;
  timestamp: number;
};

export type DashboardContextState = {
  drillDown: DrillDownState | null;
  filters: Record<string, unknown>;
  selectedPeriod: string;
  comparePeriod: string | null;
};

type DashboardAction =
  | { type: "DRILL_DOWN"; payload: Omit<DrillDownState, "timestamp"> }
  | { type: "DRILL_UP" }
  | { type: "SET_FILTERS"; payload: Record<string, unknown> }
  | { type: "SET_PERIODS"; payload: { selected: string; compare?: string | null } }
  | { type: "RESET" };

const initialState: DashboardContextState = {
  drillDown: null,
  filters: {},
  selectedPeriod: "28d",
  comparePeriod: null,
};

function dashboardReducer(state: DashboardContextState, action: DashboardAction): DashboardContextState {
  switch (action.type) {
    case "DRILL_DOWN":
      return {
        ...state,
        drillDown: {
          ...action.payload,
          timestamp: Date.now(),
        },
      };
    case "DRILL_UP":
      return {
        ...state,
        drillDown: null,
      };
    case "SET_FILTERS":
      return {
        ...state,
        filters: action.payload,
      };
    case "SET_PERIODS":
      return {
        ...state,
        selectedPeriod: action.payload.selected,
        comparePeriod: action.payload.compare ?? null,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const DashboardContext = createContext<{
  state: DashboardContextState;
  dispatch: React.Dispatch<DashboardAction>;
} | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

export function useDrillDown() {
  const { state, dispatch } = useDashboard();
  
  const drillDown = (source: string, target: string, data: Record<string, unknown>) => {
    dispatch({ type: "DRILL_DOWN", payload: { source, target, data } });
  };
  
  const drillUp = () => {
    dispatch({ type: "DRILL_UP" });
  };
  
  return {
    drillDown,
    drillUp,
    currentDrillDown: state.drillDown,
  };
}
