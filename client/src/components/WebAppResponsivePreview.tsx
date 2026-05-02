import { useState } from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeviceMode = "mobile" | "tablet" | "desktop";
type Orientation = "portrait" | "landscape";

interface DevicePreset {
  id: DeviceMode;
  label: string;
  icon: typeof Smartphone;
  width: number;
  height: number;
}

const DEVICE_PRESETS: DevicePreset[] = [
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 375, height: 812 },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768, height: 1024 },
  { id: "desktop", label: "Desktop", icon: Monitor, width: 1440, height: 900 },
];

interface WebAppResponsivePreviewProps {
  previewUrl?: string;
  projectName?: string;
}

export default function WebAppResponsivePreview({
  previewUrl = "about:blank",
  projectName = "My App",
}: WebAppResponsivePreviewProps): React.JSX.Element {
  const [activeDevice, setActiveDevice] = useState<DeviceMode>("desktop");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(100);

  const preset = DEVICE_PRESETS.find((d) => d.id === activeDevice)!;
  const isLandscape = orientation === "landscape" && activeDevice !== "desktop";
  const frameWidth = customWidth ?? (isLandscape ? preset.height : preset.width);
  const frameHeight = customHeight ?? (isLandscape ? preset.width : preset.height);

  const handleToggleOrientation = () => {
    setOrientation((prev) => (prev === "portrait" ? "landscape" : "portrait"));
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        {/* Device Selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {DEVICE_PRESETS.map((device) => (
            <button
              key={device.id}
              onClick={() => {
                setActiveDevice(device.id);
                setCustomWidth(null);
                setCustomHeight(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                activeDevice === device.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <device.icon className="w-3.5 h-3.5" />
              {device.label}
            </button>
          ))}
        </div>

        {/* Size Display & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono">{frameWidth}</span>
            <span>×</span>
            <span className="font-mono">{frameHeight}</span>
          </div>

          {activeDevice !== "desktop" && (
            <button
              onClick={handleToggleOrientation}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isLandscape ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"
              )}
              title="Toggle orientation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-1 border-l border-border pl-3">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent"
            >
              -
            </button>
            <span className="text-xs font-mono w-8 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1 border-l border-border pl-3">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showGrid ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"
              )}
              title="Toggle grid overlay"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              title="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-muted/30 flex items-center justify-center overflow-auto p-6">
        <div
          className="relative transition-all duration-300"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "center center",
          }}
        >
          {/* Device Frame */}
          {activeDevice === "mobile" && (
            <div className="relative">
              {/* Phone bezel */}
              <div className={cn(
                "bg-[#1a1a1a] rounded-[2.5rem] p-3 shadow-2xl shadow-black/40",
                isLandscape ? "px-3 py-6" : "px-6 py-3"
              )}>
                {/* Notch */}
                {!isLandscape && (
                  <div className="flex justify-center mb-2">
                    <div className="w-24 h-5 bg-[#0a0a0a] rounded-full" />
                  </div>
                )}
                {/* Screen */}
                <div
                  className="bg-white rounded-2xl overflow-hidden relative"
                  style={{ width: frameWidth, height: frameHeight }}
                >
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={`${projectName} - Mobile Preview`}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: "linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)",
                      backgroundSize: "8px 8px",
                    }} />
                  )}
                </div>
                {/* Home indicator */}
                {!isLandscape && (
                  <div className="flex justify-center mt-2">
                    <div className="w-32 h-1 bg-[#333] rounded-full" />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDevice === "tablet" && (
            <div className="relative">
              <div className={cn(
                "bg-[#1a1a1a] rounded-[1.5rem] p-4 shadow-2xl shadow-black/40"
              )}>
                <div
                  className="bg-white rounded-lg overflow-hidden relative"
                  style={{ width: frameWidth, height: frameHeight }}
                >
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={`${projectName} - Tablet Preview`}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: "linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)",
                      backgroundSize: "12px 12px",
                    }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeDevice === "desktop" && (
            <div className="relative">
              {/* Monitor frame */}
              <div className="bg-[#1a1a1a] rounded-t-xl p-2 shadow-2xl shadow-black/40">
                {/* Browser chrome */}
                <div className="bg-[#2a2a2a] rounded-t-lg px-3 py-2 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 bg-[#1a1a1a] rounded px-3 py-1 text-[10px] text-gray-400 font-mono">
                    {previewUrl === "about:blank" ? `https://${projectName.toLowerCase().replace(/\s/g, "-")}.manus.space` : previewUrl}
                  </div>
                  <RefreshCw className="w-3 h-3 text-gray-500" />
                </div>
                {/* Screen */}
                <div
                  className="bg-white overflow-hidden relative"
                  style={{ width: frameWidth, height: frameHeight }}
                >
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={`${projectName} - Desktop Preview`}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: "linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                    }} />
                  )}
                </div>
              </div>
              {/* Monitor stand */}
              <div className="flex justify-center">
                <div className="w-24 h-6 bg-[#1a1a1a]" />
              </div>
              <div className="flex justify-center">
                <div className="w-40 h-2 bg-[#1a1a1a] rounded-b-lg" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-500" />
            <span>Connected</span>
          </div>
          <span>•</span>
          <span>{activeDevice === "desktop" ? "No device emulation" : `Emulating ${preset.label}`}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Touch: {activeDevice !== "desktop" ? "Enabled" : "Disabled"}</span>
          <span>•</span>
          <span>DPR: {activeDevice === "mobile" ? "3x" : activeDevice === "tablet" ? "2x" : "1x"}</span>
        </div>
      </div>
    </div>
  );
}
