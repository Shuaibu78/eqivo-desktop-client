declare global {
  interface Window {
    electronApi?: {
      startCall: (number: string) => void;
      onCallStatus: (cb: (data: any) => void) => void;
      onError: (cb: (err: any) => void) => void;
      getCallHistory: () => Promise<any[]>;
      getMockMode: () => Promise<boolean>;
      setMockMode: (enabled: boolean) => void;
      onMockModeChanged: (cb: (data: { enabled: boolean }) => void) => void;
    };
  }
}

// Check if we're running in Electron
const isElectron =
  typeof window !== "undefined" && window.electronApi !== undefined;

// Create a safe API wrapper that checks for Electron
export const electronAPI = isElectron
  ? window.electronApi!
  : {
      startCall: () => {
        console.warn("Electron API not available - running in browser");
      },
      onCallStatus: () => {
        console.warn("Electron API not available - running in browser");
      },
      onError: () => {
        console.warn("Electron API not available - running in browser");
      },
      getCallHistory: async () => {
        console.warn("Electron API not available - running in browser");
        return [];
      },
      getMockMode: async () => {
        console.warn("Electron API not available - running in browser");
        return false;
      },
      setMockMode: () => {
        console.warn("Electron API not available - running in browser");
      },
      onMockModeChanged: () => {
        console.warn("Electron API not available - running in browser");
      },
    };

// Export a flag to check if Electron is available
export const isElectronAvailable = isElectron;
