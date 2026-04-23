/**
 * Device WebSocket Relay
 *
 * Manages WebSocket connections from Electron companion apps.
 * Each connected device is identified by deviceId and authenticated via pairing code.
 * The web app can send commands to connected devices and receive results.
 */
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { getDeviceByPairingCode, getDeviceByExternalId, updateDeviceStatus } from "./db";
import { authenticateWsUpgrade } from "./wsAuth";

type WsType = any;

interface ConnectedDevice {
  ws: WebSocket;
  deviceId: string;
  userId: number | null;
  paired: boolean;
  lastHeartbeat: number;
  capabilities?: string[];
}

const connectedDevices = new Map<string, ConnectedDevice>();

// Pending command callbacks (id → resolve)
const pendingCommands = new Map<string, {
  resolve: (result: any) => void;
  timeout: NodeJS.Timeout;
}>();

let commandCounter = 0;

/**
 * Initialize the WebSocket relay on the existing HTTP server.
 * Handles upgrade requests to /api/device/ws
 */
export function initDeviceRelay(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/api/device/ws") {
      return; // Let other upgrade handlers (e.g., Vite HMR) handle it
    }

    const deviceId = url.searchParams.get("deviceId");
    const pairingCode = url.searchParams.get("pairingCode");

    if (!deviceId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // V-001: Authenticate WebSocket upgrade via JWT cookie
    authenticateWsUpgrade(request).then(user => {
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws: any) => {
        handleDeviceConnection(ws, deviceId, pairingCode || undefined);
      });
    }).catch(() => {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    });
  });

  // Heartbeat check — disconnect stale devices every 60s
  setInterval(() => {
    const now = Date.now();
    connectedDevices.forEach((device, id) => {
      if (now - device.lastHeartbeat > 90_000) {
        console.log(`[DeviceRelay] Stale device ${id}, disconnecting`);
        device.ws.close();
        connectedDevices.delete(id);
      }
    });
  }, 60_000);

  console.log("[DeviceRelay] WebSocket relay initialized on /api/device/ws");
}

async function handleDeviceConnection(ws: WsType, deviceId: string, pairingCode?: string) {
  console.log(`[DeviceRelay] Device connected: ${deviceId}`);

  const device: ConnectedDevice = {
    ws,
    deviceId,
    userId: null,
    paired: false,
    lastHeartbeat: Date.now(),
  };

  // Try to authenticate via pairing code
  if (pairingCode) {
    try {
      const dbDevice = await getDeviceByPairingCode(pairingCode);
      if (dbDevice && dbDevice.externalId === deviceId) {
        device.userId = dbDevice.userId;
        device.paired = true;
        console.log(`[DeviceRelay] Device ${deviceId} paired to user ${dbDevice.userId}`);
      }
    } catch (err) {
      console.error(`[DeviceRelay] Pairing check failed:`, err);
    }
  }

  // Also try to match by deviceId (already registered)
  if (!device.paired) {
    try {
      const dbDevice = await getDeviceByExternalId(deviceId);
      if (dbDevice) {
        device.userId = dbDevice.userId;
        device.paired = true;
        console.log(`[DeviceRelay] Device ${deviceId} matched by externalId`);
      }
    } catch {
      // Not registered yet — will pair later
    }
  }

  connectedDevices.set(deviceId, device);

  ws.on("message", (data: any) => {
    try {
      const msg = JSON.parse(data.toString());

      // Handle heartbeat
      if (msg.type === "heartbeat") {
        device.lastHeartbeat = Date.now();
        return;
      }

      // Handle command response
      if (msg.id && pendingCommands.has(msg.id)) {
        const pending = pendingCommands.get(msg.id)!;
        clearTimeout(pending.timeout);
        pendingCommands.delete(msg.id);
        pending.resolve(msg);
        return;
      }

      // Handle unsolicited messages (e.g., device info updates)
      if (msg.type === "capabilities") {
        device.capabilities = msg.capabilities;
      }
    } catch (err) {
      console.error(`[DeviceRelay] Message parse error from ${deviceId}:`, err);
    }
  });

  ws.on("close", () => {
    console.log(`[DeviceRelay] Device disconnected: ${deviceId}`);
    connectedDevices.delete(deviceId);
  });

  ws.on("error", (err: any) => {
    console.error(`[DeviceRelay] WebSocket error for ${deviceId}:`, err);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: "welcome",
    deviceId,
    paired: device.paired,
    ts: Date.now(),
  }));
}

/**
 * Send a command to a connected device and wait for the response.
 * Used by the agent tools and tRPC procedures.
 */
export async function sendDeviceCommand(
  deviceId: string,
  command: Record<string, any>,
  timeoutMs = 30_000
): Promise<any> {
  const device = connectedDevices.get(deviceId);
  if (!device || device.ws.readyState !== WebSocket.OPEN) {
    throw new Error(`Device ${deviceId} is not connected`);
  }

  const id = `cmd_${++commandCounter}_${Date.now()}`;
  const payload = { id, ...command };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCommands.delete(id);
      reject(new Error(`Command timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingCommands.set(id, { resolve, timeout });
    device.ws.send(JSON.stringify(payload));
  });
}

/**
 * Check if a device is currently connected.
 */
export function isDeviceConnected(deviceId: string): boolean {
  const device = connectedDevices.get(deviceId);
  return !!device && device.ws.readyState === WebSocket.OPEN;
}

/**
 * Get list of all connected devices.
 */
export function getConnectedDevices(): Array<{
  deviceId: string;
  paired: boolean;
  userId: number | null;
  lastHeartbeat: number;
}> {
  return Array.from(connectedDevices.values()).map((d) => ({
    deviceId: d.deviceId,
    paired: d.paired,
    userId: d.userId,
    lastHeartbeat: d.lastHeartbeat,
  }));
}
