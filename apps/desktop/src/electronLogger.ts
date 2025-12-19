import logger from "electron-log";
import path from "path";
import { app } from "electron";

// Get USER_DATA from env or use app.getPath("userData") as fallback
// main.ts sets USER_DATA in app.whenReady(), but this provides a safety fallback
const getUserDataPath = () => {
  return process.env.USER_DATA || app.getPath("userData");
};

logger.transports.file.resolvePathFn = () =>
  path.join(getUserDataPath(), "logs/main.log");

const info = (...info: any[]) => {
  logger.info(...info);
};

const log = (...info: any[]) => {
  logger.log(...info);
};

const warn = (...warning: any[]) => {
  logger.warn(...warning);
};

const error = (...error: any[]) => {
  logger.error(...error);
};

export default {
  log,
  info,
  warn,
  error,
};
