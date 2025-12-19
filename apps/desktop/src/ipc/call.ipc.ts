import { BrowserWindow, ipcMain, Notification } from "electron";
import db from "../db/db";
import {
  startOutboundCallWithMode,
  setMockMode,
  getMockMode,
} from "../services/eqivo.service";
import { trackCall } from "../state/callTracker";

export const IPC_CHANNELS = {
  CALL_START: "call:start",
  CALL_STATUS: "call:status",
  CALL_HISTORY: "call:history",
  ON_ERROR: "call:error",
  MOCK_MODE_GET: "mock:mode:get",
  MOCK_MODE_SET: "mock:mode:set",
} as const;

ipcMain.on(IPC_CHANNELS.CALL_START, async (event, number) => {
  try {
    if (!number || !number.trim()) {
      throw new Error("Phone number is required");
    }

    const isMockMode = getMockMode();

    let from = process.env.EQIVO_FROM || process.env.CALLER_ID || "";

    if (!from) {
      if (isMockMode) {
        from = "MOCK-CALLER-123";
      } else {
        throw new Error(
          "EQIVO_FROM or CALLER_ID environment variable is not set. " +
            "Please add it to your .env file in apps/desktop/.env"
        );
      }
    }

    const call = await startOutboundCallWithMode(number.trim(), from);

    await db.saveCall(call);

    new Notification({
      title: "Call Started",
      body: `Calling ${call.to}`,
    }).show();

    const win = BrowserWindow.fromWebContents(event.sender)!;
    trackCall(call.id, win);

    event.sender.send(IPC_CHANNELS.CALL_STATUS, {
      status: call.status,
      call,
    });
  } catch (err: any) {
    console.error("Error starting call:", err);

    const errorMessage =
      err.message || err.response?.data?.message || "Failed to start call";

    event.sender.send(IPC_CHANNELS.ON_ERROR, {
      message: errorMessage,
    });
  }
});

ipcMain.handle(IPC_CHANNELS.CALL_HISTORY, () => {
  return db.getCalls();
});

ipcMain.handle(IPC_CHANNELS.MOCK_MODE_GET, () => {
  return getMockMode();
});

ipcMain.on(IPC_CHANNELS.MOCK_MODE_SET, (event, enabled: boolean) => {
  setMockMode(enabled);
  console.log(`Mock mode ${enabled ? "enabled" : "disabled"}`);
});
