import { BrowserWindow, Notification } from "electron";
import db from "../db/db";
import { getCallStatusWithMode } from "../services/eqivo.service";

export const IPC_CHANNELS = {
  CALL_START: "call:start",
  CALL_STATUS: "call:status",
  CALL_HISTORY: "call:history",
  ON_ERROR: "call:error",
} as const;

type CallState = {
  id: string;
  lastStatus: string;
  interval: NodeJS.Timeout;
};

const activeCalls = new Map<string, CallState>();

export function trackCall(callId: string, win: BrowserWindow) {
  if (activeCalls.has(callId)) return;

  let lastStatus = "initiated";

  const interval = setInterval(async () => {
    try {
      const status = await getCallStatusWithMode(callId);

      if (status !== lastStatus) {
        lastStatus = status;

        await db.updateCallStatus(callId, status);

        win.webContents.send(IPC_CHANNELS.CALL_STATUS, {
          callId,
          status,
        });

        if (status === "ringing") {
          new Notification({
            title: "Call Ringing",
            body: "The call is ringing...",
          }).show();
        } else if (status === "answered") {
          new Notification({
            title: "Call Answered",
            body: "The call has been answered",
          }).show();
        } else if (status === "ended") {
          new Notification({
            title: "Call Ended",
            body: "The call has ended",
          }).show();
          clearInterval(interval);
          activeCalls.delete(callId);
        }
      }
    } catch (err) {
      console.error("Polling failed", err);
    }
  }, 4000);

  activeCalls.set(callId, { id: callId, lastStatus, interval });
}

export function stopTracking(callId: string) {
  const callState = activeCalls.get(callId);
  if (callState) {
    clearInterval(callState.interval);
    activeCalls.delete(callId);
  }
}
