const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("companion", {
  // Device management
  getDeviceId: () => ipcRenderer.invoke("get-device-id"),
  getPairingCode: () => ipcRenderer.invoke("get-pairing-code"),
  getServerUrl: () => ipcRenderer.invoke("get-server-url"),
  connect: (serverUrl) => ipcRenderer.invoke("connect", serverUrl),
  disconnect: () => ipcRenderer.invoke("disconnect"),
  setPairingCode: (code) => ipcRenderer.invoke("set-pairing-code", code),
  testScreenshot: () => ipcRenderer.invoke("test-screenshot"),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),

  // Event listeners
  onConnectionStatus: (callback) => {
    ipcRenderer.on("connection-status", (_, data) => callback(data));
  },
  onPairingCode: (callback) => {
    ipcRenderer.on("pairing-code", (_, data) => callback(data));
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on("update-status", (_, data) => callback(data));
  },
});
