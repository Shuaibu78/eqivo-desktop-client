import logger from "electron-log";
import path from "path";
import { app } from "electron";

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
