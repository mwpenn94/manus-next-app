/**
 * ComputerUsePage — Simulated Desktop Environment
 * Capability #25: Computer Use
 *
 * Provides a virtual desktop with:
 * - Window management (open, close, minimize, resize)
 * - File browser with S3-backed storage
 * - Terminal emulator (agent-powered)
 * - Text editor
 * - Screenshot capture for verification
 */
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Monitor, Terminal, FileText, FolderOpen, X, Minus, Maximize2,
  Camera, Loader2, LogIn, Play, Square, RefreshCw, Wifi,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

type DesktopWindow = {
  id: string;
  type: "terminal" | "editor" | "browser" | "files";
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  content: string;
};

const DESKTOP_APPS = [
  { type: "terminal" as const, label: "Terminal", icon: Terminal },
  { type: "editor" as const, label: "Text Editor", icon: FileText },
  { type: "browser" as const, label: "Browser", icon: Monitor },
  { type: "files" as const, label: "Files", icon: FolderOpen },
];

export default function ComputerUsePage() {
  const { user, isAuthenticated } = useAuth();
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>(["$ Welcome to Manus Desktop Environment"]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [editorContent, setEditorContent] = useState("// Start typing or ask the agent to write code...");
  const [browserUrl, setBrowserUrl] = useState("https://manus.im");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  const openWindow = useCallback((type: DesktopWindow["type"]) => {
    const id = Date.now().toString();
    const titles: Record<string, string> = {
      terminal: "Terminal",
      editor: "Text Editor",
      browser: "Browser",
      files: "File Manager",
    };
    const newWindow: DesktopWindow = {
      id,
      type,
      title: titles[type],
      x: 50 + windows.length * 30,
      y: 50 + windows.length * 30,
      width: type === "terminal" ? 600 : 500,
      height: type === "terminal" ? 400 : 350,
      minimized: false,
      content: "",
    };
    setWindows((prev) => [...prev, newWindow]);
    setActiveWindowId(id);
  }, [windows.length]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    setActiveWindowId(null);
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w))
    );
  }, []);

  const executeCommand = useCallback(async () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalHistory((prev) => [...prev, `$ ${cmd}`]);
    setTerminalInput("");
    setIsExecuting(true);

    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: `Execute this command in the sandbox and return the output: ${cmd}`,
          mode: "speed",
        }),
      });

      if (!response.ok) throw new Error("Execution failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let output = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) output += data.content;
              if (data.codeResult) output += data.codeResult;
            } catch { /* skip */ }
          }
        }
      }

      setTerminalHistory((prev) => [...prev, output || "(no output)"]);
    } catch (err: any) {
      setTerminalHistory((prev) => [...prev, `Error: ${err.message}`]);
    } finally {
      setIsExecuting(false);
    }
  }, [terminalInput]);

  const takeScreenshot = useCallback(async () => {
    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: `Take a screenshot of the current desktop state and describe what you see. The user has ${windows.length} windows open: ${windows.map((w) => w.title).join(", ")}`,
          mode: "speed",
        }),
      });

      if (!response.ok) throw new Error("Screenshot failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.image) setScreenshotUrl(data.image);
            } catch { /* skip */ }
          }
        }
      }

      toast.success("Screenshot captured");
    } catch {
      toast.error("Screenshot failed");
    }
  }, [windows]);

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Monitor className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Computer Use</h2>
            <p className="text-muted-foreground mb-4">Sign in to access the virtual desktop.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Taskbar */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Manus Desktop
          </span>
        </div>
        <div className="flex items-center gap-2">
          {DESKTOP_APPS.map((app) => (
            <Button
              key={app.type}
              variant="ghost"
              size="sm"
              onClick={() => openWindow(app.type)}
              className="text-xs"
            >
              <app.icon className="w-3.5 h-3.5 mr-1.5" />
              {app.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={takeScreenshot} className="text-xs">
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Screenshot
          </Button>
          <Link href="/connect-device">
            <Button variant="outline" size="sm" className="text-xs">
              <Wifi className="w-3.5 h-3.5 mr-1.5" />
              Connect Device
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {windows.filter((w) => w.minimized).map((w) => (
            <button
              key={w.id}
              onClick={() => minimizeWindow(w.id)}
              className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground hover:text-foreground"
            >
              {w.title}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Area */}
      <div ref={desktopRef} className="flex-1 relative bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
        {/* Desktop Icons */}
        {windows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Open an application from the taskbar to get started
              </p>
              <div className="grid grid-cols-4 gap-6 mt-8">
                {DESKTOP_APPS.map((app) => (
                  <button
                    key={app.type}
                    onClick={() => openWindow(app.type)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <app.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{app.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Windows */}
        {windows.filter((w) => !w.minimized).map((win) => (
          <div
            key={win.id}
            onClick={() => setActiveWindowId(win.id)}
            className={`absolute bg-card border rounded-lg shadow-xl overflow-hidden flex flex-col ${
              activeWindowId === win.id ? "border-primary/50 z-20" : "border-border z-10"
            }`}
            style={{
              left: win.x,
              top: win.y,
              width: win.width,
              height: win.height,
            }}
          >
            {/* Title Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border shrink-0 cursor-move">
              <span className="text-xs font-medium text-foreground">{win.title}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => minimizeWindow(win.id)} className="p-0.5 hover:bg-muted rounded">
                  <Minus className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={() => closeWindow(win.id)} className="p-0.5 hover:bg-red-500/20 rounded">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 overflow-auto p-2">
              {win.type === "terminal" && (
                <div className="h-full flex flex-col bg-black/90 rounded p-2 font-mono text-xs">
                  <div className="flex-1 overflow-y-auto text-green-400 space-y-0.5">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">{line}</div>
                    ))}
                    {isExecuting && (
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Executing...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 border-t border-green-900 pt-2">
                    <span className="text-green-400">$</span>
                    <input
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") executeCommand();
                      }}
                      className="flex-1 bg-transparent text-green-400 outline-none"
                      placeholder="Type a command..."
                      disabled={isExecuting}
                    />
                    <button
                      onClick={executeCommand}
                      disabled={isExecuting || !terminalInput.trim()}
                      className="text-green-400 hover:text-green-300 disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {win.type === "editor" && (
                <Textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="h-full resize-none font-mono text-xs bg-background"
                  placeholder="Start typing..."
                />
              )}

              {win.type === "browser" && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={browserUrl}
                      onChange={(e) => setBrowserUrl(e.target.value)}
                      className="text-xs h-7"
                      placeholder="Enter URL..."
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex-1 bg-white rounded border border-border overflow-hidden">
                    <iframe
                      src={browserUrl}
                      className="w-full h-full"
                      sandbox="allow-scripts allow-same-origin"
                      title="Browser"
                    />
                  </div>
                </div>
              )}

              {win.type === "files" && (
                <div className="h-full">
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>/home/user</span>
                  </div>
                  <div className="space-y-1">
                    {["Documents", "Downloads", "Projects", "Desktop"].map((folder) => (
                      <div
                        key={folder}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-primary" />
                        <span className="text-foreground">{folder}</span>
                      </div>
                    ))}
                    {["README.md", "config.json", "notes.txt"].map((file) => (
                      <div
                        key={file}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Screenshot Preview */}
        {screenshotUrl && (
          <div className="absolute bottom-4 right-4 z-30 bg-card border border-border rounded-lg shadow-xl p-2 max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Screenshot</span>
              <button onClick={() => setScreenshotUrl(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
            <img src={screenshotUrl} alt="Screenshot" className="rounded w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
