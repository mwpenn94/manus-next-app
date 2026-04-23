/**
 * ImageLightbox — Full-resolution image overlay with annotation tools
 *
 * Opens when clicking a thumbnail in the sidebar or task view.
 * Supports keyboard navigation (Arrow keys, Escape), and inline annotation
 * with pen, highlighter, arrow, text, and eraser tools.
 * Annotated images can be sent back to the agent via the existing upload flow.
 *
 * Convergence Pass 1: Full canvas overlay, tool palette, undo/redo, send-to-agent.
 */
import { useEffect, useCallback, useRef, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, Download, ExternalLink,
  Pen, Highlighter, Type, ArrowUpRight, Eraser,
  Undo2, Redo2, Send, Loader2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──
interface Point { x: number; y: number }

type StrokeType = "pen" | "highlighter" | "arrow" | "text" | "eraser";

interface Stroke {
  type: StrokeType;
  points: Point[];
  color: string;
  width: number;
  text?: string; // for text tool
}

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  /** Optional: task ID for "send to agent" upload */
  taskId?: string;
  /** Optional: callback after annotation is sent to agent */
  onAnnotationSent?: (url: string) => void;
}

// ── Tool Config ──
const TOOLS: { type: StrokeType; icon: typeof Pen; label: string; shortcut: string }[] = [
  { type: "pen", icon: Pen, label: "Pen", shortcut: "P" },
  { type: "highlighter", icon: Highlighter, label: "Highlighter", shortcut: "H" },
  { type: "arrow", icon: ArrowUpRight, label: "Arrow", shortcut: "A" },
  { type: "text", icon: Type, label: "Text", shortcut: "T" },
  { type: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
];

const COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ffffff", // white
];

const DEFAULT_WIDTHS: Record<StrokeType, number> = {
  pen: 3,
  highlighter: 18,
  arrow: 3,
  text: 16, // font size
  eraser: 20,
};

export default function ImageLightbox({
  images, currentIndex, onClose, onNavigate, taskId, onAnnotationSent,
}: ImageLightboxProps) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const currentUrl = images[currentIndex];

  // ── Annotation State ──
  const [annotating, setAnnotating] = useState(false);
  const [activeTool, setActiveTool] = useState<StrokeType>("pen");
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // ── Navigation ──
  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(currentIndex - 1);
      setStrokes([]);
      setRedoStack([]);
    }
  }, [hasPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1);
      setStrokes([]);
      setRedoStack([]);
    }
  }, [hasNext, currentIndex, onNavigate]);

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in text input
      if (textInput) return;

      switch (e.key) {
        case "Escape":
          if (annotating) { setAnnotating(false); } else { onClose(); }
          break;
        case "ArrowLeft":
          if (!annotating) handlePrev();
          break;
        case "ArrowRight":
          if (!annotating) handleNext();
          break;
        case "z":
          if ((e.metaKey || e.ctrlKey) && e.shiftKey) { handleRedo(); }
          else if (e.metaKey || e.ctrlKey) { handleUndo(); }
          break;
        case "p": case "P":
          if (annotating && !e.metaKey && !e.ctrlKey) setActiveTool("pen");
          break;
        case "h": case "H":
          if (annotating && !e.metaKey && !e.ctrlKey) setActiveTool("highlighter");
          break;
        case "a": case "A":
          if (annotating && !e.metaKey && !e.ctrlKey) setActiveTool("arrow");
          break;
        case "t": case "T":
          if (annotating && !e.metaKey && !e.ctrlKey) setActiveTool("text");
          break;
        case "e": case "E":
          if (annotating && !e.metaKey && !e.ctrlKey) setActiveTool("eraser");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handlePrev, handleNext, annotating, textInput]);

  // Prevent body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Focus text input when it appears
  useEffect(() => {
    if (textInput && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput]);

  // ── Canvas Rendering ──
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas to displayed image size
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;

      ctx.save();

      if (stroke.type === "pen") {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.type === "highlighter") {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.type === "arrow" && stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 14;

        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";

        // Line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLen * Math.cos(angle - Math.PI / 6),
          end.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          end.x - headLen * Math.cos(angle + Math.PI / 6),
          end.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (stroke.type === "text" && stroke.text) {
        ctx.fillStyle = stroke.color;
        ctx.font = `bold ${stroke.width}px system-ui, -apple-system, sans-serif`;
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
      } else if (stroke.type === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Re-render on window resize
  useEffect(() => {
    const handler = () => renderCanvas();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [renderCanvas]);

  // ── Drawing Handlers ──
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e: React.MouseEvent) => {
    if (!annotating) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (activeTool === "text") {
      setTextInput(pt);
      setTextValue("");
      return;
    }

    setIsDrawing(true);
    setCurrentStroke({
      type: activeTool,
      points: [pt],
      color: activeColor,
      width: DEFAULT_WIDTHS[activeTool],
    });
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentStroke) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (activeTool === "arrow") {
      // For arrow, only keep start and current point
      setCurrentStroke(prev => prev ? { ...prev, points: [prev.points[0], pt] } : null);
    } else {
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    if (currentStroke.points.length > 1 || currentStroke.type === "arrow") {
      setStrokes(prev => [...prev, currentStroke]);
      setRedoStack([]);
    }
    setCurrentStroke(null);
  };

  const handleTextSubmit = () => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      setTextValue("");
      return;
    }
    setStrokes(prev => [...prev, {
      type: "text",
      points: [textInput],
      color: activeColor,
      width: DEFAULT_WIDTHS.text,
      text: textValue,
    }]);
    setRedoStack([]);
    setTextInput(null);
    setTextValue("");
  };

  // ── Undo / Redo ──
  const handleUndo = useCallback(() => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [...r, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes(s => [...s, last]);
      return prev.slice(0, -1);
    });
  }, []);

  // ── Composite & Send ──
  const compositeAndSend = async () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    setSending(true);
    try {
      // Create a full-resolution composite
      const offscreen = document.createElement("canvas");
      const displayRect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / displayRect.width;
      const scaleY = img.naturalHeight / displayRect.height;

      offscreen.width = img.naturalWidth;
      offscreen.height = img.naturalHeight;
      const ctx = offscreen.getContext("2d")!;

      // Draw original image
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      // Draw annotations at full resolution
      for (const stroke of strokes) {
        if (stroke.points.length === 0) continue;
        ctx.save();

        const scaledPoints = stroke.points.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
        const scaledWidth = stroke.width * Math.max(scaleX, scaleY);

        if (stroke.type === "pen") {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = scaledWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
          for (let i = 1; i < scaledPoints.length; i++) {
            ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
          }
          ctx.stroke();
        } else if (stroke.type === "highlighter") {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = scaledWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
          for (let i = 1; i < scaledPoints.length; i++) {
            ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
          }
          ctx.stroke();
        } else if (stroke.type === "arrow" && scaledPoints.length >= 2) {
          const start = scaledPoints[0];
          const end = scaledPoints[scaledPoints.length - 1];
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLen = 14 * Math.max(scaleX, scaleY);

          ctx.strokeStyle = stroke.color;
          ctx.fillStyle = stroke.color;
          ctx.lineWidth = scaledWidth;
          ctx.lineCap = "round";

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        } else if (stroke.type === "text" && stroke.text) {
          ctx.fillStyle = stroke.color;
          const fontSize = stroke.width * Math.max(scaleX, scaleY);
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(stroke.text, scaledPoints[0].x, scaledPoints[0].y);
        } else if (stroke.type === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
          ctx.lineWidth = scaledWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
          for (let i = 1; i < scaledPoints.length; i++) {
            ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
          }
          ctx.stroke();
        }

        ctx.restore();
      }

      // Export as blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        offscreen.toBlob(b => b ? resolve(b) : reject(new Error("Canvas export failed")), "image/png");
      });

      // Upload via existing /api/upload endpoint
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
          "X-File-Name": `annotated-${Date.now()}.png`,
          "X-Task-Id": taskId || "unknown",
        },
        credentials: "include",
        body: blob,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const data = await response.json();
      const uploadedUrl = data.url || data.fileUrl;

      if (uploadedUrl && onAnnotationSent) {
        onAnnotationSent(uploadedUrl);
      }

      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch (err) {
      console.error("[ImageLightbox] Annotation send failed:", err);
    } finally {
      setSending(false);
    }
  };

  // ── Cursor style ──
  const getCursorClass = () => {
    if (!annotating) return "cursor-default";
    switch (activeTool) {
      case "pen": return "cursor-crosshair";
      case "highlighter": return "cursor-crosshair";
      case "arrow": return "cursor-crosshair";
      case "text": return "cursor-text";
      case "eraser": return "cursor-cell";
      default: return "cursor-crosshair";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={annotating ? undefined : onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20">
        <span className="text-sm text-white/70">
          {images.length > 1 ? `${currentIndex + 1} / ${images.length}` : ""}
          {annotating && <span className="ml-2 text-primary text-xs font-medium">Annotating</span>}
        </span>
        <div className="flex items-center gap-2">
          {/* Toggle annotation mode */}
          <button
            onClick={(e) => { e.stopPropagation(); setAnnotating(!annotating); }}
            className={cn(
              "p-2 rounded-lg transition-colors",
              annotating
                ? "text-primary bg-primary/20 hover:bg-primary/30"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            title={annotating ? "Exit annotation mode" : "Annotate image"}
          >
            <Pen className="w-4 h-4" />
          </button>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={currentUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Annotation Tool Palette (left side) */}
      {annotating && (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {TOOLS.map(tool => (
            <button
              key={tool.type}
              onClick={() => setActiveTool(tool.type)}
              className={cn(
                "p-2.5 rounded-lg transition-all relative group",
                activeTool === tool.type
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <tool.icon className="w-4 h-4" />
              <span className="absolute left-full ml-2 px-2 py-1 rounded text-xs bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {tool.label} ({tool.shortcut})
              </span>
            </button>
          ))}

          <div className="w-full h-px bg-white/10 my-1" />

          {/* Color picker */}
          <div className="flex flex-col gap-1 items-center">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-all",
                  activeColor === color ? "border-white scale-125" : "border-transparent hover:scale-110"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="w-full h-px bg-white/10 my-1" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className={cn(
              "p-2 rounded-lg transition-colors",
              strokes.length > 0 ? "text-white/60 hover:text-white hover:bg-white/10" : "text-white/20"
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className={cn(
              "p-2 rounded-lg transition-colors",
              redoStack.length > 0 ? "text-white/60 hover:text-white hover:bg-white/10" : "text-white/20"
            )}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Send to agent */}
          {strokes.length > 0 && (
            <>
              <div className="w-full h-px bg-white/10 my-1" />
              <button
                onClick={compositeAndSend}
                disabled={sending || sent}
                className={cn(
                  "p-2.5 rounded-lg transition-all",
                  sent
                    ? "bg-green-500/20 text-green-400"
                    : sending
                    ? "bg-primary/20 text-primary"
                    : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/30"
                )}
                title="Send annotated image to agent"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 sent ? <Check className="w-4 h-4" /> :
                 <Send className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      )}

      {/* Image + Canvas overlay */}
      <div
        className={cn("relative max-w-[90vw] max-h-[85vh] flex items-center justify-center", getCursorClass())}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imgRef}
          src={currentUrl}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
          draggable={false}
          crossOrigin="anonymous"
          onLoad={renderCanvas}
        />
        {annotating && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full rounded-lg"
            style={{ touchAction: "none" }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
          />
        )}

        {/* Floating text input */}
        {textInput && annotating && (
          <div
            className="absolute z-30"
            style={{ left: textInput.x, top: textInput.y - 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextSubmit();
                if (e.key === "Escape") { setTextInput(null); setTextValue(""); }
              }}
              onBlur={handleTextSubmit}
              className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1 text-sm outline-none min-w-[120px]"
              style={{ color: activeColor, fontWeight: "bold" }}
              placeholder="Type here..."
            />
          </div>
        )}
      </div>

      {/* Prev button */}
      {hasPrev && !annotating && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-all"
          title="Previous (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {hasNext && !annotating && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-all"
          title="Next (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Thumbnail strip (when multiple images and not annotating) */}
      {images.length > 1 && !annotating && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onNavigate(i); }}
              className={cn(
                "w-10 h-10 rounded-md overflow-hidden border-2 transition-all shrink-0",
                i === currentIndex
                  ? "border-white opacity-100 scale-110"
                  : "border-transparent opacity-50 hover:opacity-80"
              )}
            >
              <img
                src={url}
                alt={`Thumb ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
