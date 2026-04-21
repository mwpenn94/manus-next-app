/**
 * ConnectDevicePage — BYOD Device Connection Manager
 * Capability #47: My Computer
 *
 * Allows users to connect their own devices (desktop, Android, iOS)
 * via multiple free methods: CDP browser, ADB wireless, Cloudflare VNC,
 * Electron companion app, WDA REST, or iOS Shortcuts.
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Smartphone, Tablet, Globe, Wifi, WifiOff,
  Plus, Trash2, Copy, Check, ChevronRight, Loader2,
  LogIn, Laptop, Settings, Zap, Shield, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

type DeviceType = "desktop" | "android" | "ios" | "browser_only";
type ConnectionMethod = "electron_app" | "cloudflare_vnc" | "cdp_browser" | "adb_wireless" | "wda_rest" | "shortcuts_webhook";

const DEVICE_TYPE_META: Record<DeviceType, { label: string; icon: typeof Monitor; description: string }> = {
  desktop: { label: "Desktop / Laptop", icon: Laptop, description: "Windows, macOS, or Linux computer" },
  android: { label: "Android Device", icon: Smartphone, description: "Phone or tablet running Android" },
  ios: { label: "iOS Device", icon: Tablet, description: "iPhone or iPad" },
  browser_only: { label: "Browser Only", icon: Globe, description: "Control Chrome tabs remotely" },
};

const CONNECTION_METHODS: Record<ConnectionMethod, { label: string; cost: string; platforms: DeviceType[]; recommended?: boolean; description: string }> = {
  cdp_browser: {
    label: "Chrome DevTools Protocol (CDP)",
    cost: "Free",
    platforms: ["desktop", "android", "browser_only"],
    recommended: true,
    description: "Zero install. Relaunch Chrome with remote debugging, tunnel via Cloudflare. Controls browser tabs with full DOM access.",
  },
  adb_wireless: {
    label: "ADB + Accessibility Tree",
    cost: "Free",
    platforms: ["android"],
    recommended: true,
    description: "Full native control of any Android app. Uses wireless ADB + accessibility services + Tailscale tunnel.",
  },
  cloudflare_vnc: {
    label: "VNC + Cloudflare Tunnel",
    cost: "Free",
    platforms: ["desktop"],
    description: "Uses your OS built-in VNC/Remote Desktop server tunneled through Cloudflare's free tier.",
  },
  electron_app: {
    label: "Manus Companion App",
    cost: "Free",
    platforms: ["desktop"],
    description: "Full desktop control via a lightweight companion app (~50 MB). Connects via outbound WebSocket.",
  },
  wda_rest: {
    label: "WebDriverAgent (iOS)",
    cost: "Free (GitHub Actions build)",
    platforms: ["ios"],
    description: "Full iOS automation via WebDriverAgent. Requires one-time WDA build via Xcode or GitHub Actions.",
  },
  shortcuts_webhook: {
    label: "iOS Shortcuts (Limited)",
    cost: "Free / $5/mo (Pushcut Pro)",
    platforms: ["ios"],
    description: "Trigger pre-built Shortcuts automations via webhook. Limited to pre-configured actions.",
  },
};

export default function ConnectDevicePage() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<"list" | "add" | "setup" | "instructions">("list");
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const devices = trpc.device.list.useQuery(undefined, { enabled: isAuthenticated });
  const createDevice = trpc.device.create.useMutation({
    onSuccess: () => {
      toast.success("Device created — follow the setup instructions to complete pairing");
      devices.refetch();
      setView("instructions");
    },
    onError: (err) => { toast.error(err.message); },
  });
  const completePairing = trpc.device.completePairing.useMutation({
    onSuccess: () => {
      toast.success("Device paired successfully!");
      devices.refetch();
      setView("list");
      setTunnelUrl("");
    },
    onError: (err) => { toast.error(err.message); },
  });
  const deleteDevice = trpc.device.delete.useMutation({
    onSuccess: () => {
      toast.success("Device removed");
      devices.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });
  const setupInstructions = trpc.device.getSetupInstructions.useQuery(
    { connectionMethod: selectedMethod! },
    { enabled: !!selectedMethod && view === "instructions" }
  );

  const [latestDevice] = useMemo(() => {
    if (!devices.data) return [null];
    return [devices.data[0]];
  }, [devices.data]);

  const availableMethods = useMemo(() => {
    if (!selectedType) return [];
    return (Object.entries(CONNECTION_METHODS) as [ConnectionMethod, typeof CONNECTION_METHODS[ConnectionMethod]][])
      .filter(([, meta]) => meta.platforms.includes(selectedType))
      .sort((a, b) => (b[1].recommended ? 1 : 0) - (a[1].recommended ? 1 : 0));
  }, [selectedType]);

  const handleCreateDevice = () => {
    if (!selectedType || !selectedMethod || !deviceName.trim()) return;
    createDevice.mutate({
      name: deviceName.trim(),
      deviceType: selectedType,
      connectionMethod: selectedMethod,
    });
  };

  const handleCompletePairing = () => {
    if (!latestDevice?.pairingCode || !tunnelUrl.trim()) return;
    completePairing.mutate({
      pairingCode: latestDevice.pairingCode,
      tunnelUrl: tunnelUrl.trim(),
    });
  };

  const copyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Monitor className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Connect Your Device</h2>
            <p className="text-muted-foreground mb-4">Sign in to connect and control your devices.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Device List View ──
  if (view === "list") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Connected Devices
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your own computer, phone, or tablet for the agent to control
            </p>
          </div>
          <Button onClick={() => { setView("add"); setSelectedType(null); setSelectedMethod(null); setDeviceName(""); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>

        {devices.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !devices.data?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No devices connected</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your desktop, Android phone, or iOS device to let the agent control it remotely. All methods are free.
              </p>
              <Button onClick={() => { setView("add"); setSelectedType(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Connect Your First Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {devices.data.map((device) => {
              const typeMeta = DEVICE_TYPE_META[device.deviceType as DeviceType];
              const methodMeta = CONNECTION_METHODS[device.connectionMethod as ConnectionMethod];
              const Icon = typeMeta?.icon ?? Monitor;
              return (
                <Card key={device.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{device.name}</span>
                            <Badge variant={device.status === "online" ? "default" : device.status === "pairing" ? "secondary" : "outline"} className="text-xs">
                              {device.status === "online" && <Wifi className="w-3 h-3 mr-1" />}
                              {device.status === "offline" && <WifiOff className="w-3 h-3 mr-1" />}
                              {device.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {methodMeta?.label ?? device.connectionMethod} · {typeMeta?.label ?? device.deviceType}
                            {device.osInfo && ` · ${device.osInfo}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.status === "pairing" && device.pairingCode && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPairingCode(device.pairingCode!)}
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                            {device.pairingCode}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDevice.mutate({ id: device.id })}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {device.status === "pairing" && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                          Enter the tunnel URL from your device to complete pairing:
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={tunnelUrl}
                            onChange={(e) => setTunnelUrl(e.target.value)}
                            placeholder="https://your-tunnel-url.trycloudflare.com"
                            className="text-xs h-8"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!device.pairingCode || !tunnelUrl.trim()) return;
                              completePairing.mutate({ pairingCode: device.pairingCode, tunnelUrl: tunnelUrl.trim() });
                            }}
                            disabled={!tunnelUrl.trim() || completePairing.isPending}
                          >
                            {completePairing.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Pair"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <Zap className="w-5 h-5 text-primary mb-2" />
              <h4 className="text-sm font-medium text-foreground">Zero Cost</h4>
              <p className="text-xs text-muted-foreground mt-1">All connection methods use free tools — Cloudflare Tunnel, ADB, Chrome DevTools.</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <Shield className="w-5 h-5 text-primary mb-2" />
              <h4 className="text-sm font-medium text-foreground">Secure by Default</h4>
              <p className="text-xs text-muted-foreground mt-1">All connections are encrypted. Your device connects outbound — no ports to open.</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <Settings className="w-5 h-5 text-primary mb-2" />
              <h4 className="text-sm font-medium text-foreground">Multi-Platform</h4>
              <p className="text-xs text-muted-foreground mt-1">Desktop (Win/Mac/Linux), Android (full native), iOS (WDA or Shortcuts).</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Add Device: Select Type ──
  if (view === "add" && !selectedType) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to devices
        </button>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          What type of device?
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Choose the device you want the agent to control
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.entries(DEVICE_TYPE_META) as [DeviceType, typeof DEVICE_TYPE_META[DeviceType]][]).map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">{meta.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1 group-hover:text-primary" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Add Device: Select Method ──
  if (view === "add" && selectedType && !selectedMethod) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => setSelectedType(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to device type
        </button>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          Choose connection method
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          All methods are free. Recommended options are marked.
        </p>
        <div className="space-y-3">
          {availableMethods.map(([method, meta]) => (
            <button
              key={method}
              onClick={() => setSelectedMethod(method)}
              className="w-full text-left p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">{meta.label}</span>
                    {meta.recommended && <Badge className="text-[10px]">Recommended</Badge>}
                    <Badge variant="outline" className="text-[10px]">{meta.cost}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{meta.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 mt-1 shrink-0 group-hover:text-primary" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Add Device: Name & Create ──
  if (view === "add" && selectedType && selectedMethod) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={() => setSelectedMethod(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to methods
        </button>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          Name your device
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Give it a recognizable name so you can identify it later
        </p>
        <div className="space-y-4">
          <Input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder={`e.g., My ${DEVICE_TYPE_META[selectedType].label}`}
            className="h-11"
            autoFocus
          />
          <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p><strong className="text-foreground">Type:</strong> {DEVICE_TYPE_META[selectedType].label}</p>
            <p className="mt-1"><strong className="text-foreground">Method:</strong> {CONNECTION_METHODS[selectedMethod].label}</p>
            <p className="mt-1"><strong className="text-foreground">Cost:</strong> {CONNECTION_METHODS[selectedMethod].cost}</p>
          </div>
          <Button
            onClick={handleCreateDevice}
            disabled={!deviceName.trim() || createDevice.isPending}
            className="w-full"
          >
            {createDevice.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Device & Get Setup Instructions
          </Button>
        </div>
      </div>
    );
  }

  // ── Setup Instructions ──
  if (view === "instructions") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to devices
        </button>

        {setupInstructions.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : setupInstructions.data ? (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              {setupInstructions.data.title}
            </h2>
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="text-xs">
                {setupInstructions.data.cost}
              </Badge>
              {setupInstructions.data.platforms.map((p) => (
                <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
              ))}
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {setupInstructions.data.requirements.map((req, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Setup Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {setupInstructions.data.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {latestDevice?.status === "pairing" && latestDevice.pairingCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Complete Pairing</CardTitle>
                  <CardDescription>Enter the tunnel URL from the setup steps above</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded">
                    <span className="text-xs text-muted-foreground">Pairing Code:</span>
                    <code className="font-mono text-sm text-primary font-bold">{latestDevice.pairingCode}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyPairingCode(latestDevice.pairingCode!)}>
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tunnelUrl}
                      onChange={(e) => setTunnelUrl(e.target.value)}
                      placeholder="https://your-tunnel-url.trycloudflare.com"
                      className="text-sm"
                    />
                    <Button onClick={handleCompletePairing} disabled={!tunnelUrl.trim() || completePairing.isPending}>
                      {completePairing.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No instructions available.</p>
        )}
      </div>
    );
  }

  return null;
}
