import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SimContextType = {
  simulation: boolean;
  setSimulation: (v: boolean) => void;
};

const SimContext = createContext<SimContextType | undefined>(undefined);

export const SimProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulation, setSimulationState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sim_mode");
      return saved === "1";
    } catch {
      return false;
    }
  });

  const setSimulation = (v: boolean) => {
    setSimulationState(v);
    try {
      localStorage.setItem("sim_mode", v ? "1" : "0");
    } catch {}
  };

  const value = useMemo(() => ({ simulation, setSimulation }), [simulation]);
  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
};

export const useSim = (): SimContextType => {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used within SimProvider");
  return ctx;
};


