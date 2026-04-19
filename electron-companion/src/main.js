const { app, BrowserWindow, Tray, Menu, ipcMain, screen, clipboard, nativeImage } = require("electron");
const path = require("path");
const WebSocket = require("ws");
const { nanoid } = require("nanoid");
const Store = require("electron-store");

const store = new Store();
let mainWindow = null;
let tray = null;
let wsConnection = null;
let pairingCode = null;
let deviceId = store.get("deviceId") || nanoid(16);
store.set("deviceId", deviceId);

// ── App Configuration ──
const DEFAULT_SERVER = "wss://manusnext-mlromfub.manus.space";
const RECONNECT_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;

// ── Main Window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    frame: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "..", "src", "renderer.html"));
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── System Tray ──
function createTray() {
  tray = new Tray(path.join(__dirname, "..", "assets", "tray-icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Companion", click: () => mainWindow?.show() },
    { type: "separator" },
    {
      label: "Connection",
      sublabel: wsConnection ? "Connected" : "Disconnected",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Manus Next Companion");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => mainWindow?.show());
}

// ── WebSocket Relay ──
function connectToServer(serverUrl) {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }

  const url = `${serverUrl}/api/device/ws?deviceId=${deviceId}&pairingCode=${pairingCode || ""}`;
  console.log(`[WS] Connecting to ${url}`);

  wsConnection = new WebSocket(url);

  wsConnection.on("open", () => {
    console.log("[WS] Connected");
    sendToRenderer("connection-status", { connected: true, server: serverUrl });
    startHeartbeat();
  });

  wsConnection.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const result = await handleCommand(msg);
      if (result && msg.id) {
        wsConnection.send(JSON.stringify({ id: msg.id, ...result }));
      }
    } catch (err) {
      console.error("[WS] Message error:", err.message);
    }
  });

  wsConnection.on("close", () => {
    console.log("[WS] Disconnected, reconnecting...");
    sendToRenderer("connection-status", { connected: false });
    setTimeout(() => connectToServer(serverUrl), RECONNECT_INTERVAL);
  });

  wsConnection.on("error", (err) => {
    console.error("[WS] Error:", err.message);
  });
}

let heartbeatTimer = null;
function startHeartbeat() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (wsConnection?.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }));
    }
  }, HEARTBEAT_INTERVAL);
}

// ── Command Handler ──
async function handleCommand(msg) {
  switch (msg.type) {
    case "screenshot": {
      return await takeScreenshot();
    }
    case "click": {
      return await performClick(msg.x, msg.y, msg.button || "left");
    }
    case "type": {
      return await performType(msg.text);
    }
    case "keypress": {
      return await performKeypress(msg.key, msg.modifiers);
    }
    case "scroll": {
      return await performScroll(msg.x, msg.y, msg.deltaX || 0, msg.deltaY || 0);
    }
    case "eval": {
      // CDP browser eval — forward to local Chrome
      return await cdpEval(msg.expression, msg.cdpPort || 9222);
    }
    case "navigate": {
      return await cdpNavigate(msg.url, msg.cdpPort || 9222);
    }
    case "get_info": {
      return getSystemInfo();
    }
    case "set_pairing_code": {
      pairingCode = msg.code;
      sendToRenderer("pairing-code", { code: pairingCode });
      return { success: true };
    }
    default:
      return { error: `Unknown command: ${msg.type}` };
  }
}

// ── Native Automation ──
async function takeScreenshot() {
  try {
    const screenshot = require("screenshot-desktop");
    const imgBuffer = await screenshot({ format: "png" });
    return {
      type: "screenshot_result",
      data: imgBuffer.toString("base64"),
      format: "png",
      timestamp: Date.now(),
    };
  } catch (err) {
    return { type: "error", error: `Screenshot failed: ${err.message}` };
  }
}

async function performClick(x, y, button) {
  try {
    const { mouse, Button, Point } = require("@nut-tree-fork/nut-js");
    const point = new Point(x, y);
    await mouse.setPosition(point);
    const btn = button === "right" ? Button.RIGHT : Button.LEFT;
    await mouse.click(btn);
    return { type: "click_result", success: true, x, y, button };
  } catch (err) {
    return { type: "error", error: `Click failed: ${err.message}` };
  }
}

async function performType(text) {
  try {
    const { keyboard } = require("@nut-tree-fork/nut-js");
    await keyboard.type(text);
    return { type: "type_result", success: true, length: text.length };
  } catch (err) {
    return { type: "error", error: `Type failed: ${err.message}` };
  }
}

async function performKeypress(key, modifiers = []) {
  try {
    const { keyboard, Key } = require("@nut-tree-fork/nut-js");
    const keyMap = {
      enter: Key.Enter,
      tab: Key.Tab,
      escape: Key.Escape,
      backspace: Key.Backspace,
      delete: Key.Delete,
      up: Key.Up,
      down: Key.Down,
      left: Key.Left,
      right: Key.Right,
      home: Key.Home,
      end: Key.End,
      pageup: Key.PageUp,
      pagedown: Key.PageDown,
      space: Key.Space,
      f1: Key.F1, f2: Key.F2, f3: Key.F3, f4: Key.F4,
      f5: Key.F5, f6: Key.F6, f7: Key.F7, f8: Key.F8,
      f9: Key.F9, f10: Key.F10, f11: Key.F11, f12: Key.F12,
    };
    const modMap = {
      ctrl: Key.LeftControl,
      alt: Key.LeftAlt,
      shift: Key.LeftShift,
      meta: Key.LeftSuper,
    };
    const mainKey = keyMap[key.toLowerCase()] || Key[key];
    const modKeys = modifiers.map((m) => modMap[m.toLowerCase()]).filter(Boolean);
    if (modKeys.length > 0) {
      await keyboard.pressKey(...modKeys, mainKey);
      await keyboard.releaseKey(...modKeys, mainKey);
    } else {
      await keyboard.pressKey(mainKey);
      await keyboard.releaseKey(mainKey);
    }
    return { type: "keypress_result", success: true, key, modifiers };
  } catch (err) {
    return { type: "error", error: `Keypress failed: ${err.message}` };
  }
}

async function performScroll(x, y, deltaX, deltaY) {
  try {
    const { mouse, Point } = require("@nut-tree-fork/nut-js");
    await mouse.setPosition(new Point(x, y));
    if (deltaY !== 0) await mouse.scrollDown(Math.abs(deltaY) * (deltaY > 0 ? 1 : -1));
    return { type: "scroll_result", success: true };
  } catch (err) {
    return { type: "error", error: `Scroll failed: ${err.message}` };
  }
}

// ── CDP Bridge ──
const http = require("http");

function cdpHttpGet(port, path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function cdpEval(expression, port) {
  try {
    const targets = await cdpHttpGet(port, "/json/list");
    const page = targets.find((t) => t.type === "page");
    if (!page) return { type: "error", error: "No CDP page target" };

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    return new Promise((resolve) => {
      ws.on("open", () => {
        ws.send(JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true },
        }));
      });
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.id === 1) {
          ws.close();
          resolve({
            type: "eval_result",
            value: msg.result?.result?.value,
            error: msg.error?.message,
          });
        }
      });
      setTimeout(() => {
        ws.close();
        resolve({ type: "error", error: "CDP eval timeout" });
      }, 10000);
    });
  } catch (err) {
    return { type: "error", error: `CDP eval failed: ${err.message}` };
  }
}

async function cdpNavigate(url, port) {
  try {
    const targets = await cdpHttpGet(port, "/json/list");
    const page = targets.find((t) => t.type === "page");
    if (!page) return { type: "error", error: "No CDP page target" };

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    return new Promise((resolve) => {
      ws.on("open", () => {
        ws.send(JSON.stringify({
          id: 1,
          method: "Page.navigate",
          params: { url },
        }));
      });
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.id === 1) {
          ws.close();
          resolve({ type: "navigate_result", success: true, url });
        }
      });
      setTimeout(() => {
        ws.close();
        resolve({ type: "error", error: "CDP navigate timeout" });
      }, 10000);
    });
  } catch (err) {
    return { type: "error", error: `CDP navigate failed: ${err.message}` };
  }
}

// ── System Info ──
function getSystemInfo() {
  const os = require("os");
  const displays = screen.getAllDisplays();
  return {
    type: "system_info",
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + " GB",
    displays: displays.map((d) => ({
      id: d.id,
      width: d.size.width,
      height: d.size.height,
      scaleFactor: d.scaleFactor,
    })),
    deviceId,
  };
}

// ── IPC from Renderer ──
function sendToRenderer(channel, data) {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

ipcMain.handle("get-device-id", () => deviceId);
ipcMain.handle("get-pairing-code", () => pairingCode);
ipcMain.handle("get-server-url", () => store.get("serverUrl", DEFAULT_SERVER));

ipcMain.handle("connect", (_, serverUrl) => {
  store.set("serverUrl", serverUrl);
  connectToServer(serverUrl);
  return { success: true };
});

ipcMain.handle("disconnect", () => {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
  return { success: true };
});

ipcMain.handle("set-pairing-code", (_, code) => {
  pairingCode = code;
  return { success: true };
});

ipcMain.handle("test-screenshot", async () => {
  return await takeScreenshot();
});

// ── App Lifecycle ──
app.whenReady().then(() => {
  createWindow();
  createTray();

  const savedServer = store.get("serverUrl");
  if (savedServer) {
    connectToServer(savedServer);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  clearInterval(heartbeatTimer);
  if (wsConnection) wsConnection.close();
});
