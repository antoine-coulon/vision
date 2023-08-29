import React from "react";
import { AppShell } from "@mantine/core";

import { DoubleNavbar } from "./sidebar/Layout";
import GraphNetwork from "./network/Network.tsx";
import GlobalSearch from "./global-search/GlobalSearch.tsx";
import { SkottCycles, SkottStructureWithMetadata } from "./skott";
import Header from "./header/Header.tsx";
import { useEventStore } from "./EventChannels.tsx";

function fetchAnalysisReport(): Promise<SkottStructureWithMetadata> {
  return fetch("/api/analysis")
    .then((res) => res.json())
    .catch(() => {});
}

function fetchCyclesReport(): Promise<SkottCycles> {
  return fetch("/api/cycles")
    .then((res) => res.json())
    .catch(() => ({
      cycles: [],
    }));
}

function App() {
  const store = useEventStore();

  React.useEffect(() => {
    Promise.all([fetchAnalysisReport(), fetchCyclesReport()])
      .then(([analysisReport, cyclesReport]) => {
        const nextValue = {
          ...analysisReport,
          cycles: cyclesReport.cycles,
        };
        store.setInitialStore(nextValue);
        store.dataStore$.next(nextValue);
      })
      .catch((exception) => {
        console.error("Failed to fetch analysis report", exception);
      });
  }, []);

  return (
    <>
      <GlobalSearch />
      <AppShell header={<Header />} navbar={<DoubleNavbar />}>
        <div className="root-container">
          <GraphNetwork />
        </div>
      </AppShell>
    </>
  );
}

export default App;
