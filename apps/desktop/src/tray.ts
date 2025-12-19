import { Tray, Menu, app, BrowserWindow, dialog } from "electron";
import path from "path";
import fs from "fs";
import { getMockMode, setMockMode } from "./services/eqivo.service";

let tray: Tray;
let mainWindowRef: BrowserWindow | null = null;

interface TrayCallbacks {
  onOpen: () => void;
  getMainWindow: () => BrowserWindow | null | undefined;
}

export function setupTray(callbacks: TrayCallbacks) {
  const win = callbacks.getMainWindow();
  mainWindowRef = win || null;

  const imagePath = path.join(__dirname, "..", "src", "assets", "tray.png");

  if (!fs.existsSync(imagePath)) {
    console.error(`Tray icon not found at: ${imagePath}`);
    const appPath = app.getAppPath();
    const altPath = path.join(appPath, "src", "assets", "tray.png");
    if (fs.existsSync(altPath)) {
      tray = new Tray(altPath);
    } else {
      console.error(`Tray icon also not found at: ${altPath}`);
      throw new Error(
        `Failed to find tray icon. Tried: ${imagePath} and ${altPath}`
      );
    }
  } else {
    tray = new Tray(imagePath);
  }

  const updateMenu = () => {
    const isMockMode = getMockMode();
    const window = callbacks.getMainWindow();
    const isVisible = window?.isVisible() ?? false;

    const menu = Menu.buildFromTemplate([
      {
        label: "Eqivo Telephony Client",
        enabled: false,
      },
      { type: "separator" },
      {
        label: isVisible ? "Hide Window" : "Show Window",
        click: () => {
          const win = callbacks.getMainWindow();
          if (win) {
            if (isVisible) {
              win.hide();
            } else {
              win.show();
              win.focus();
            }
          } else {
            callbacks.onOpen();
          }
        },
      },
      {
        label: "Open",
        accelerator: "CommandOrControl+Shift+C",
        click: callbacks.onOpen,
      },
      { type: "separator" },
      {
        label: "Toggle Mock Mode",
        type: "checkbox",
        checked: isMockMode,
        click: () => {
          const newMode = !isMockMode;
          setMockMode(newMode);
          updateMenu();
          const win = callbacks.getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send("call:mock-mode-changed", {
              enabled: newMode,
            });
          }
        },
      },
      { type: "separator" },
      {
        label: "About",
        click: async () => {
          const win = callbacks.getMainWindow();
          const options: Electron.MessageBoxOptions = {
            type: "info",
            title: "About Eqivo Telephony Client",
            message: "Eqivo Telephony Client",
            detail: `Version: ${app.getVersion()}\n\nA desktop client for making and managing telephony calls via the Eqivo API.`,
            buttons: ["OK"],
          };
          if (win && !win.isDestroyed()) {
            await dialog.showMessageBox(win, options);
          } else {
            await dialog.showMessageBox(options);
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        accelerator: process.platform === "darwin" ? "Command+Q" : "Ctrl+Q",
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(menu);
  };

  updateMenu();

  const window = callbacks.getMainWindow();
  if (window) {
    window.on("show", updateMenu);
    window.on("hide", updateMenu);
  }

  tray.on("double-click", callbacks.onOpen);

  tray.on("click", () => {
    if (process.platform !== "darwin") {
      const win = callbacks.getMainWindow();
      if (win) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      } else {
        callbacks.onOpen();
      }
    }
  });

  tray.setToolTip(
    "Eqivo Telephony Client\nClick to show menu\nDouble-click to open window"
  );
}

export function updateMainWindow(window: BrowserWindow | null) {
  mainWindowRef = window;
}
