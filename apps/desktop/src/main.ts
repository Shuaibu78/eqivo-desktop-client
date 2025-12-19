// Load environment variables from .env file first, before any other imports
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { app } from "electron";

// Load .env file from the desktop folder (parent of dist/)
// __dirname will be 'dist/' in compiled code, so go up one level to find .env
const envPath = path.join(__dirname, "..", ".env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  // .env file not found or error reading it
  console.warn(`Warning: Could not load .env file from ${envPath}`);
  console.warn(
    "Make sure RAPIDAPI_KEY is set in your .env file or as an environment variable"
  );
} else {
  console.log(`Loaded environment variables from ${envPath}`);
}

// Now import other modules that may use environment variables
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

  // Handle window close (hide instead of destroy on macOS)
  mainWindow.on("close", (event) => {
    if (process.platform !== "darwin") {
      // On Windows/Linux, quit the app
      app.quit();
    } else {
      // On macOS, hide the window instead of closing
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Clean up reference when window is destroyed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

const getMainWindow = () => mainWindow;

app.whenReady().then(() => {
  // Set USER_DATA default if not already set
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
