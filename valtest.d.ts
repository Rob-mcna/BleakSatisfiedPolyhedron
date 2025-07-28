// Add this at the top of your file or in a separate .d.ts file

// Option 1: Extend the Window interface
declare global {
  interface Window {
    valveTestResults: { [wellName: string]: { [valveId: string]: any[] } };
    selectedValveTestIndex: { [wellName: string]: { [valveId: string]: number } };
    wells: any[];
    allValves: any[];
    currentUser: { login: string };
    deviations: any[];
    // Add other custom properties you use on window
    renderMultiRingDashboard: () => void;
    fetchWellsAndSyncResults: () => Promise<void>;
    runIntegrityTestAndRefreshDashboard: (testData: any) => void;
    fetchValveTestResults: () => Promise<any>;
    getLiveStatusForAllRings: (well: any) => any[];
  }
}

// Export empty object to make this a module
export {};