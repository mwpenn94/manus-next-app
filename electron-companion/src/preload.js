const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("companion", {
  getDeviceId: () => ipcRenderer.invoke("get-device-id"),
  getPairingCode: () => ipcRenderer.invoke("get-pairing-code"),
  getServerUrl: () => ipcRenderer.invoke("get-server-url"),
  connect: (serverUrl) => ipcRenderer.invoke("connect", serverUrl),
  disconnect: () => ipcRenderer.invoke("disconnect"),
  setPairingCode: (code) => ipcRenderer.invoke("set-pairing-code", code),
  testScreenshot: () => ipcRenderer.invoke("test-screenshot"),

  onConnectionStatus: (callback) => {
    ipcRenderer.on("connection-status", (_, data) => callback(data));
  },
  onPairingCode: (callback) => {
    ipcRenderer.on("pairing-code", (_, data) => callback(data));
  },
});
