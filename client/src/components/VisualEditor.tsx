/**
 * VisualEditor — iframe postMessage protocol for live element selection and inline editing.
 * 
 * Architecture:
 * 1. Injects a selection script into the preview iframe via postMessage
 * 2. User hovers → elements get highlighted with overlay
 * 3. User clicks → element is "selected" and its computed styles are sent back
 * 4. Property editor panel shows editable properties (colors, spacing, text, borders)
 * 5. Changes are sent back to iframe for live preview, and persisted via tRPC mutation
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  MousePointer2,
  Paintbrush,
  Type,
  Square,
  Move,
  Undo2,
  Redo2,
  Save,
  X,
  Pipette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types for the visual editor protocol
interface SelectedElement {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  selector: string; // CSS selector path for targeting
  rect: { x: number; y: number; width: number; height: number };
  computedStyles: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    fontStyle: string;
    textAlign: string;
    padding: string;
    margin: string;
    borderRadius: string;
    borderColor: string;
    borderWidth: string;
    opacity: string;
    display: string;
  };
}

interface StyleChange {
  selector: string;
  property: string;
  value: string;
  previousValue: string;
}

type EditorMode = "select" | "text" | "style" | "layout";

interface VisualEditorProps {
  previewUrl: string;
  projectId: string;
  onClose: () => void;
}

// The injection script that runs inside the iframe
const INJECTION_SCRIPT = `
(function() {
  if (window.__visualEditorActive) return;
  window.__visualEditorActive = true;

  let hoveredEl = null;
  let selectedEl = null;
  let overlay = null;
  let selectionOverlay = null;

  // Create hover overlay
  overlay = document.createElement('div');
  overlay.id = '__ve-hover-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99998;border:2px dashed #3b82f6;background:rgba(59,130,246,0.05);transition:all 0.1s ease;display:none;';
  document.body.appendChild(overlay);

  // Create selection overlay
  selectionOverlay = document.createElement('div');
  selectionOverlay.id = '__ve-selection-overlay';
  selectionOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);display:none;';
  document.body.appendChild(selectionOverlay);

  // Create resize handles
  const handles = ['nw','ne','sw','se'].map(pos => {
    const h = document.createElement('div');
    h.style.cssText = 'position:absolute;width:8px;height:8px;background:#3b82f6;border:1px solid white;border-radius:2px;';
    if (pos.includes('n')) h.style.top = '-4px';
    if (pos.includes('s')) h.style.bottom = '-4px';
    if (pos.includes('w')) h.style.left = '-4px';
    if (pos.includes('e')) h.style.right = '-4px';
    selectionOverlay.appendChild(h);
    return h;
  });

  // Label showing tag name
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:-22px;left:0;background:#3b82f6;color:white;font-size:10px;padding:2px 6px;border-radius:3px;font-family:monospace;white-space:nowrap;';
  selectionOverlay.appendChild(label);

  function getCssSelector(el) {
    if (el.id) return '#' + el.id;
    const parts = [];
    while (el && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.id) { parts.unshift('#' + el.id); break; }
      if (el.className && typeof el.className === 'string') {
        const cls = el.className.trim().split(/\\s+/).filter(c => !c.startsWith('__ve')).slice(0, 2).join('.');
        if (cls) selector += '.' + cls;
      }
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
        if (siblings.length > 1) selector += ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
      }
      parts.unshift(selector);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }

  function getComputedStylesForElement(el) {
    const cs = getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textAlign: cs.textAlign,
      padding: cs.padding,
      margin: cs.margin,
      borderRadius: cs.borderRadius,
      borderColor: cs.borderColor,
      borderWidth: cs.borderWidth,
      opacity: cs.opacity,
      display: cs.display,
    };
  }

  function positionOverlay(el, target) {
    const rect = el.getBoundingClientRect();
    target.style.left = rect.left + 'px';
    target.style.top = rect.top + 'px';
    target.style.width = rect.width + 'px';
    target.style.height = rect.height + 'px';
    target.style.display = 'block';
    return rect;
  }

  // Hover handler
  document.addEventListener('mousemove', function(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay || el === selectionOverlay || el.id?.startsWith('__ve')) return;
    if (el === hoveredEl) return;
    hoveredEl = el;
    positionOverlay(el, overlay);
  }, true);

  document.addEventListener('mouseleave', function() {
    overlay.style.display = 'none';
    hoveredEl = null;
  }, true);

  // Click handler — select element
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id?.startsWith('__ve')) return;
    selectedEl = el;
    const rect = positionOverlay(el, selectionOverlay);
    label.textContent = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '');

    // Send selection to parent
    window.parent.postMessage({
      type: 'visual-editor-select',
      payload: {
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        className: el.className || '',
        textContent: (el.textContent || '').slice(0, 200),
        selector: getCssSelector(el),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        computedStyles: getComputedStylesForElement(el),
      }
    }, '*');
  }, true);

  // Listen for style changes from parent
  window.addEventListener('message', function(e) {
    if (e.data?.type === 'visual-editor-apply-style' && selectedEl) {
      const { property, value } = e.data.payload;
      selectedEl.style[property] = value;
      // Re-send updated styles
      window.parent.postMessage({
        type: 'visual-editor-style-updated',
        payload: { property, value, computedStyles: getComputedStylesForElement(selectedEl) }
      }, '*');
    }
    if (e.data?.type === 'visual-editor-set-text' && selectedEl) {
      selectedEl.textContent = e.data.payload.text;
    }
    if (e.data?.type === 'visual-editor-deselect') {
      selectedEl = null;
      selectionOverlay.style.display = 'none';
    }
    if (e.data?.type === 'visual-editor-destroy') {
      overlay.remove();
      selectionOverlay.remove();
      document.removeEventListener('mousemove', arguments.callee);
      window.__visualEditorActive = false;
    }
  });

  // Notify parent that editor is ready
  window.parent.postMessage({ type: 'visual-editor-ready' }, '*');
})();
`;

export default function VisualEditor({ previewUrl, projectId, onClose }: VisualEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [changeHistory, setChangeHistory] = useState<StyleChange[]>([]);
  const [undoStack, setUndoStack] = useState<StyleChange[]>([]);
  const [isInjected, setIsInjected] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  const saveChangesMut = trpc.webappProject.saveVisualEdits.useMutation();

  // Inject the selection script into the iframe
  const injectScript = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "visual-editor-inject", script: INJECTION_SCRIPT }, "*");
    // Also try direct injection for same-origin
    try {
      const doc = iframe.contentDocument;
      if (doc) {
        const script = doc.createElement("script");
        script.textContent = INJECTION_SCRIPT;
        doc.body.appendChild(script);
        setIsInjected(true);
      }
    } catch {
      // Cross-origin — rely on postMessage
    }
  }, []);

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "visual-editor-ready") {
        setIsInjected(true);
      }
      if (e.data?.type === "visual-editor-select") {
        setSelectedElement(e.data.payload);
      }
      if (e.data?.type === "visual-editor-style-updated") {
        // Update local state with new computed styles
        setSelectedElement((prev) =>
          prev ? { ...prev, computedStyles: e.data.payload.computedStyles } : null
        );
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Apply a style change
  const applyStyle = useCallback(
    (property: string, value: string) => {
      if (!selectedElement) return;
      const previousValue = (selectedElement.computedStyles as any)[property] || "";
      const change: StyleChange = {
        selector: selectedElement.selector,
        property,
        value,
        previousValue,
      };
      setChangeHistory((prev) => [...prev, change]);
      setUndoStack([]);

      // Send to iframe
      iframeRef.current?.contentWindow?.postMessage(
        { type: "visual-editor-apply-style", payload: { property, value } },
        "*"
      );
    },
    [selectedElement]
  );

  // Apply text change
  const applyText = useCallback(
    (text: string) => {
      if (!selectedElement) return;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "visual-editor-set-text", payload: { text } },
        "*"
      );
      setSelectedElement((prev) => (prev ? { ...prev, textContent: text } : null));
    },
    [selectedElement]
  );

  // Undo
  const handleUndo = useCallback(() => {
    const last = changeHistory[changeHistory.length - 1];
    if (!last) return;
    setChangeHistory((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, last]);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "visual-editor-apply-style", payload: { property: last.property, value: last.previousValue } },
      "*"
    );
  }, [changeHistory]);

  // Redo
  const handleRedo = useCallback(() => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((prev) => prev.slice(0, -1));
    setChangeHistory((prev) => [...prev, last]);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "visual-editor-apply-style", payload: { property: last.property, value: last.value } },
      "*"
    );
  }, [undoStack]);

  // Save all changes
  const handleSave = useCallback(() => {
    if (changeHistory.length === 0) return;
    saveChangesMut.mutate({
      projectId,
      changes: changeHistory.map((c) => ({
        selector: c.selector,
        property: c.property,
        value: c.value,
      })),
    });
  }, [changeHistory, projectId, saveChangesMut]);

  // Deselect
  const handleDeselect = useCallback(() => {
    setSelectedElement(null);
    iframeRef.current?.contentWindow?.postMessage({ type: "visual-editor-deselect" }, "*");
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          {/* Mode buttons */}
          {(
            [
              { mode: "select" as EditorMode, icon: MousePointer2, label: "Select" },
              { mode: "text" as EditorMode, icon: Type, label: "Text" },
              { mode: "style" as EditorMode, icon: Paintbrush, label: "Style" },
              { mode: "layout" as EditorMode, icon: Move, label: "Layout" },
            ] as const
          ).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setEditorMode(mode)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                editorMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={changeHistory.length === 0}
            className="h-7 w-7 p-0"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={undoStack.length === 0}
            className="h-7 w-7 p-0"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={changeHistory.length === 0}
            className="h-7 text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Save ({changeHistory.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 ml-1">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main content: iframe + property panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview iframe */}
        <div className="flex-1 relative">
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0"
            title="Visual Editor Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={injectScript}
          />
          {!isInjected && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center">
                <MousePointer2 className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-foreground">Loading visual editor...</p>
                <p className="text-xs text-muted-foreground mt-1">Click elements to select and edit them</p>
              </div>
            </div>
          )}
        </div>

        {/* Property Panel */}
        {isPanelExpanded && selectedElement && (
          <div className="w-72 border-l border-border bg-card overflow-y-auto">
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Square className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-mono font-medium text-foreground">
                    {selectedElement.tagName}
                    {selectedElement.id && <span className="text-primary">#{selectedElement.id}</span>}
                  </span>
                </div>
                <button onClick={handleDeselect} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                {selectedElement.selector}
              </p>
            </div>

            {/* Text editing */}
            {(editorMode === "text" || editorMode === "select") && selectedElement.textContent && (
              <div className="p-3 border-b border-border">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Text Content
                </label>
                <textarea
                  className="w-full mt-1.5 px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={selectedElement.textContent}
                  onChange={(e) => applyText(e.target.value)}
                />
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    onClick={() => applyStyle("fontWeight", selectedElement.computedStyles.fontWeight === "700" ? "400" : "700")}
                    className={cn("p-1 rounded", selectedElement.computedStyles.fontWeight === "700" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent")}
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => applyStyle("fontStyle", selectedElement.computedStyles.fontStyle === "italic" ? "normal" : "italic")}
                    className={cn("p-1 rounded", selectedElement.computedStyles.fontStyle === "italic" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent")}
                  >
                    <Italic className="w-3 h-3" />
                  </button>
                  <div className="w-px h-4 bg-border mx-0.5" />
                  <button onClick={() => applyStyle("textAlign", "left")} className={cn("p-1 rounded", selectedElement.computedStyles.textAlign === "left" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent")}>
                    <AlignLeft className="w-3 h-3" />
                  </button>
                  <button onClick={() => applyStyle("textAlign", "center")} className={cn("p-1 rounded", selectedElement.computedStyles.textAlign === "center" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent")}>
                    <AlignCenter className="w-3 h-3" />
                  </button>
                  <button onClick={() => applyStyle("textAlign", "right")} className={cn("p-1 rounded", selectedElement.computedStyles.textAlign === "right" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent")}>
                    <AlignRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Color properties */}
            {(editorMode === "style" || editorMode === "select") && (
              <div className="p-3 border-b border-border">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Colors
                </label>
                <div className="mt-2 space-y-2">
                  <ColorInput
                    label="Text"
                    value={selectedElement.computedStyles.color}
                    onChange={(v) => applyStyle("color", v)}
                  />
                  <ColorInput
                    label="Background"
                    value={selectedElement.computedStyles.backgroundColor}
                    onChange={(v) => applyStyle("backgroundColor", v)}
                  />
                  <ColorInput
                    label="Border"
                    value={selectedElement.computedStyles.borderColor}
                    onChange={(v) => applyStyle("borderColor", v)}
                  />
                </div>
              </div>
            )}

            {/* Spacing */}
            {(editorMode === "layout" || editorMode === "select") && (
              <div className="p-3 border-b border-border">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Spacing
                </label>
                <div className="mt-2 space-y-2">
                  <SpacingInput
                    label="Padding"
                    value={selectedElement.computedStyles.padding}
                    onChange={(v) => applyStyle("padding", v)}
                  />
                  <SpacingInput
                    label="Margin"
                    value={selectedElement.computedStyles.margin}
                    onChange={(v) => applyStyle("margin", v)}
                  />
                </div>
              </div>
            )}

            {/* Border & Shape */}
            {(editorMode === "style" || editorMode === "select") && (
              <div className="p-3 border-b border-border">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Border & Shape
                </label>
                <div className="mt-2 space-y-2">
                  <NumberInput
                    label="Border Width"
                    value={selectedElement.computedStyles.borderWidth}
                    onChange={(v) => applyStyle("borderWidth", v)}
                    unit="px"
                  />
                  <NumberInput
                    label="Border Radius"
                    value={selectedElement.computedStyles.borderRadius}
                    onChange={(v) => applyStyle("borderRadius", v)}
                    unit="px"
                  />
                  <NumberInput
                    label="Opacity"
                    value={selectedElement.computedStyles.opacity}
                    onChange={(v) => applyStyle("opacity", v)}
                    unit=""
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>
              </div>
            )}

            {/* Typography */}
            {(editorMode === "text" || editorMode === "style") && (
              <div className="p-3">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Typography
                </label>
                <div className="mt-2 space-y-2">
                  <NumberInput
                    label="Font Size"
                    value={selectedElement.computedStyles.fontSize}
                    onChange={(v) => applyStyle("fontSize", v)}
                    unit="px"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel toggle */}
        {selectedElement && (
          <button
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-card border border-border rounded-l-md p-1 text-muted-foreground hover:text-foreground z-10"
            style={{ right: isPanelExpanded ? "288px" : "0" }}
          >
            {isPanelExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

// Sub-components for property inputs
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => setLocalValue(value), [value]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16">{label}</span>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          type="color"
          value={rgbToHex(localValue)}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange(e.target.value);
          }}
          className="w-6 h-6 rounded border border-border cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange(e.target.value);
          }}
          className="flex-1 px-2 py-1 bg-background border border-border rounded text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

function SpacingInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => setLocalValue(value), [value]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16">{label}</span>
      <input
        type="text"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }}
        className="flex-1 px-2 py-1 bg-background border border-border rounded text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="e.g. 8px 16px"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  unit,
  min = 0,
  max = 999,
  step = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const numericValue = parseFloat(value) || 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16">{label}</span>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numericValue}
          onChange={(e) => onChange(e.target.value + unit)}
          className="flex-1 h-1 accent-primary"
        />
        <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">
          {numericValue}{unit}
        </span>
      </div>
    </div>
  );
}

// Utility: convert rgb() to hex for color input
function rgbToHex(rgb: string): string {
  if (rgb.startsWith("#")) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#000000";
  const r = parseInt(match[1]).toString(16).padStart(2, "0");
  const g = parseInt(match[2]).toString(16).padStart(2, "0");
  const b = parseInt(match[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
