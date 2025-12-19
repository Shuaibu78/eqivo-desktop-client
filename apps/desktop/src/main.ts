import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { app } from "electron";

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

import { BrowserWindow, globalShortcut } from "electron";
import electronLogger from "./electronLogger";
import "./ipc/call.ipc";
import { setupTray } from "./tray";

if (!process.env.USER_DATA) {
  if (app.isReady()) {
    process.env.USER_DATA = app.getPath("userData");
  }
}

let mainWindow: BrowserWindow | null = null;

electronLogger.log(path.join(__dirname, "preload.js"));
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const rendererURL = "http://localhost:5173";

  try {
    const response = await fetch(rendererURL);
    if (response.status !== 200) {
      throw new Error(`server not ready at ${rendererURL}`);
    }

    mainWindow.loadURL(rendererURL);
  } catch (error) {
    console.error("Error fetching renderer URL:", error);
    return;
  }

  mainWindow.on("close", (event) => {
    if (process.platform !== "darwin") {
      app.quit();
    } else {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

const getMainWindow = () => mainWindow;

app.whenReady().then(() => {
  if (!process.env.USER_DATA) {
    process.env.USER_DATA = app.getPath("userData");
  }

  createWindow();

  setupTray({
    onOpen: () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    },
    getMainWindow: getMainWindow,
  });

  globalShortcut.register("CommandOrControl+Shift+C", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
});

app.getAppPath();

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
