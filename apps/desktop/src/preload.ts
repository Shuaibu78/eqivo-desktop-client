import { contextBridge, ipcRenderer } from "electron";

export const IPC_CHANNELS = {
  CALL_START: "call:start",
  CALL_STATUS: "call:status",
  CALL_HISTORY: "call:history",
  ON_ERROR: "call:error",
  MOCK_MODE_GET: "mock:mode:get",
  MOCK_MODE_SET: "mock:mode:set",
} as const;

contextBridge.exposeInMainWorld("electronApi", {
  startCall: (number: string) => {
    ipcRenderer.send(IPC_CHANNELS.CALL_START, number);
  },

  onCallStatus: (cb: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.CALL_STATUS, (_: any, data: any) => cb(data));
  },

  onError: (cb: (err: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.ON_ERROR, (_: any, err: any) => cb(err));
  },

  getCallHistory: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CALL_HISTORY);
  },

  getMockMode: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.MOCK_MODE_GET);
  },

  setMockMode: (enabled: boolean) => {
    ipcRenderer.send(IPC_CHANNELS.MOCK_MODE_SET, enabled);
  },

  onMockModeChanged: (cb: (data: { enabled: boolean }) => void) => {
    ipcRenderer.on("call:mock-mode-changed", (_: any, data: any) => cb(data));
  },
});
