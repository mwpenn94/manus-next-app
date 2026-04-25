import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { 
  completeDevicePairing,
  createConnectedDevice,
  createDeviceSession,
  deleteConnectedDevice,
  endDeviceSession,
  getActiveDeviceSession,
  getDeviceByExternalId,
  getDeviceByPairingCode,
  getUserDeviceSessions,
  getUserDevices,
  updateDeviceConnection,
  updateDeviceSession,
  updateDeviceStatus,
 } from "../db";
import { validateTunnelUrl } from "../urlValidator";

export const deviceRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserDevices(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) return null;
        return device;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        deviceType: z.enum(["desktop", "android", "ios", "browser_only"]),
        connectionMethod: z.enum(["electron_app", "cloudflare_vnc", "cdp_browser", "adb_wireless", "wda_rest", "shortcuts_webhook"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const pairingCode = nanoid(6).toUpperCase();
        return createConnectedDevice({
          userId: ctx.user.id,
          name: input.name,
          deviceType: input.deviceType,
          connectionMethod: input.connectionMethod,
          pairingCode,
          status: "pairing",
        });
      }),
    completePairing: protectedProcedure
      .input(z.object({
        pairingCode: z.string().min(1),
        tunnelUrl: z.string().min(1).url().refine(url => /^https?:\/\//.test(url), { message: "Tunnel URL must use http:// or https://" }).refine(url => validateTunnelUrl(url).valid, { message: "Tunnel URL targets a restricted address" }),
        osInfo: z.string().optional(),
        capabilities: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByPairingCode(input.pairingCode);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid pairing code" });
        await completeDevicePairing(device.id, input.tunnelUrl, input.osInfo, input.capabilities as any);
        return { success: true, deviceId: device.externalId };
      }),
    updateConnection: protectedProcedure
      .input(z.object({ externalId: z.string(), tunnelUrl: z.string().min(1).url().refine(url => /^https?:\/\//.test(url), { message: "Tunnel URL must use http:// or https://" }).refine(url => validateTunnelUrl(url).valid, { message: "Tunnel URL targets a restricted address" }) }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        await updateDeviceConnection(device.id, input.tunnelUrl);
        return { success: true };
      }),
    updateStatus: protectedProcedure
      .input(z.object({ externalId: z.string(), status: z.enum(["online", "offline", "pairing", "error"]), lastError: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        await updateDeviceStatus(device.id, input.status, input.lastError);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConnectedDevice(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Execute a command on a connected device via its relay/tunnel */
    execute: protectedProcedure
      .input(z.object({
        deviceExternalId: z.string(),
        action: z.enum(["screenshot", "click", "type", "scroll", "keypress", "launch_app", "navigate", "accessibility_tree"]),
        params: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.deviceExternalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        if (device.status !== "online" || !device.tunnelUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Device is not connected" });
        // Relay the command to the device's tunnel endpoint
        try {
          const response = await fetch(`${device.tunnelUrl}/api/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: input.action, params: input.params ?? {} }),
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok) {
            const errText = await response.text().catch(() => "Unknown error");
            await updateDeviceStatus(device.id, "error", errText);
            throw new TRPCError({ code: "BAD_REQUEST", message: `Device command failed: ${errText}` });
          }
          const result = await response.json();
          // Update session stats
          const session = await getActiveDeviceSession(device.id);
          if (session) {
            const updates: Record<string, unknown> = { commandCount: (session.commandCount ?? 0) + 1 };
            if (input.action === "screenshot" && result.screenshotUrl) {
              updates.screenshotCount = (session.screenshotCount ?? 0) + 1;
              updates.lastScreenshotUrl = result.screenshotUrl;
            }
            await updateDeviceSession(session.id, updates as any);
          }
          return result;
        } catch (err: any) {
          if (err.name === "TimeoutError") {
            await updateDeviceStatus(device.id, "error", "Command timed out");
            throw new TRPCError({ code: "BAD_REQUEST", message: "Device command timed out" });
          }
          throw err;
        }
      }),
    /** Start a control session on a device */
    startSession: protectedProcedure
      .input(z.object({ deviceExternalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.deviceExternalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        // End any existing active session
        const existing = await getActiveDeviceSession(device.id);
        if (existing) await endDeviceSession(existing.id);
        return createDeviceSession({
          userId: ctx.user.id,
          deviceId: device.id,
          status: "active",
        });
      }),
    endSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify session belongs to user
        const sessions = await getUserDeviceSessions(ctx.user.id);
        const session = sessions.find(s => s.id === input.sessionId);
        if (!session) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to end this session" });
        await endDeviceSession(input.sessionId);
        return { success: true };
      }),
    sessions: protectedProcedure.query(async ({ ctx }) => {
      return getUserDeviceSessions(ctx.user.id);
    }),
    /** Generate setup instructions for each connection method */
    getSetupInstructions: protectedProcedure
      .input(z.object({ connectionMethod: z.enum(["electron_app", "cloudflare_vnc", "cdp_browser", "adb_wireless", "wda_rest", "shortcuts_webhook"]) }))
      .query(async ({ input }) => {
        const instructions: Record<string, { title: string; steps: string[]; requirements: string[]; cost: string; platforms: string[] }> = {
          cdp_browser: {
            title: "Browser Control (CDP) — Zero Install",
            steps: [
              "Close all Chrome windows on your device",
              "Relaunch Chrome with: chrome --remote-debugging-port=9222",
              "Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
              "Run: cloudflared tunnel --url http://localhost:9222",
              "Copy the generated tunnel URL and paste it here",
            ],
            requirements: ["Chrome or Chromium browser", "cloudflared CLI (free)"],
            cost: "Free",
            platforms: ["Windows", "macOS", "Linux", "Android (via ADB)"],
          },
          adb_wireless: {
            title: "Android Device Control (ADB + Accessibility)",
            steps: [
              "On your Android device: Settings → Developer Options → Enable Wireless Debugging",
              "Note the IP address and port shown",
              "On your PC, run: adb pair <ip>:<port> (enter the pairing code)",
              "Then: adb connect <ip>:<port>",
              "Install Tailscale on both devices for persistent connection: https://tailscale.com",
              "Run the relay server: npx @manus/device-relay --adb",
              "Copy the relay URL and paste it here",
            ],
            requirements: ["Android device with Developer Options enabled", "ADB installed on PC", "Tailscale (free) for persistent tunnel"],
            cost: "Free",
            platforms: ["Android"],
          },
          cloudflare_vnc: {
            title: "Desktop Control (VNC + Cloudflare Tunnel)",
            steps: [
              "Enable your OS built-in VNC/Remote Desktop server",
              "  - macOS: System Preferences → Sharing → Screen Sharing",
              "  - Windows: Settings → System → Remote Desktop → Enable",
              "  - Linux: Install and start vino or x11vnc",
              "Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
              "Run: cloudflared tunnel --url tcp://localhost:5900",
              "Copy the generated tunnel URL and paste it here",
            ],
            requirements: ["VNC server enabled on your device", "cloudflared CLI (free)"],
            cost: "Free",
            platforms: ["Windows", "macOS", "Linux"],
          },
          electron_app: {
            title: "Full Desktop Control (Companion App)",
            steps: [
              "Download the Manus Desktop Companion app from the releases page",
              "Install and launch the app",
              "The app will display a pairing code",
              "Enter the pairing code below to connect",
              "The app connects via outbound WebSocket (works through any firewall)",
            ],
            requirements: ["Manus Desktop Companion app (~50 MB)"],
            cost: "Free",
            platforms: ["Windows", "macOS", "Linux"],
          },
          wda_rest: {
            title: "iOS Device Control (WebDriverAgent)",
            steps: [
              "Build WebDriverAgent using Xcode or GitHub Actions (see docs)",
              "Install the WDA IPA on your iOS device using pymobiledevice3",
              "Start WDA on the device",
              "Set up a tunnel: cloudflared tunnel --url http://localhost:8100",
              "Copy the tunnel URL and paste it here",
            ],
            requirements: ["iOS device", "WDA built and installed (requires Xcode or GitHub Actions)", "cloudflared CLI"],
            cost: "Free (with GitHub Actions for WDA build)",
            platforms: ["iOS"],
          },
          shortcuts_webhook: {
            title: "iOS Shortcuts (Limited Control)",
            steps: [
              "Install the Pushcut app from the App Store (free tier available)",
              "Create Shortcuts automations for the actions you want to control",
              "Set up Pushcut webhook triggers for each Shortcut",
              "Enter the Pushcut webhook base URL here",
            ],
            requirements: ["iOS device", "Pushcut app (free tier)", "Apple Shortcuts"],
            cost: "Free (limited) / $5/mo (Pushcut Pro)",
            platforms: ["iOS"],
          },
        };
        return instructions[input.connectionMethod] ?? null;
      }),
  });
