/**
 * Auto-Updater Module
 *
 * Handles automatic updates via electron-updater.
 * Checks for updates on startup and periodically.
 * Notifies the renderer of update status.
 */

const { autoUpdater } = require("electron-updater");
const { ipcMain } = require("electron");

let mainWindow = null;

function initAutoUpdater(window) {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Event handlers
  autoUpdater.on("checking-for-update", () => {
    sendStatus("checking", "Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    sendStatus("available", `Update ${info.version} available`, info);
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus("up-to-date", "You are running the latest version");
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus("downloading", `Downloading: ${Math.round(progress.percent)}%`, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendStatus("ready", `Update ${info.version} ready to install`, info);
  });

  autoUpdater.on("error", (err) => {
    sendStatus("error", `Update error: ${err.message}`);
  });

  // IPC handlers
  ipcMain.handle("check-for-updates", async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle("download-update", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Check for updates on startup (after 10s delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 10_000);

  // Check periodically (every 4 hours)
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

function sendStatus(status, message, data = null) {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send("update-status", { status, message, data });
  }
}

module.exports = { initAutoUpdater };
