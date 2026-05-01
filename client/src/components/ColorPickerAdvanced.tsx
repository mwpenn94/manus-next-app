import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  History, 
  Palette 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";


// Helper functions for color conversion
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
};

const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s
    ? l === r
      ? (g - b) / s
      : l === g
      ? 2 + (b - r) / s
      : 4 + (r - g) / s
    : 0;
  return [
    Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
    Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
    Math.round((100 * (2 * l - s)) / 2),
  ];
};

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

const MOCK_SAVED_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];

const MOCK_RECENT_COLORS = ["#0f172a", "#334155", "#64748b"];

export default function ColorPickerAdvanced() {
  const [color, setColor] = useState<HSLColor>({ h: 250, s: 80, l: 60 });
  const [hexInput, setHexInput] = useState<string>("");
  const [savedColors, setSavedColors] = useState<string[]>(MOCK_SAVED_COLORS);
  const [recentColors, setRecentColors] = useState<string[]>(MOCK_RECENT_COLORS);
  const [copiedStatus, setCopiedStatus] = useState(false);
  
  
  const spectrumRef = useRef<HTMLDivElement>(null);

  // Derived values
  const rgb = useMemo(() => hslToRgb(color.h, color.s, color.l), [color]);
  const hex = useMemo(() => rgbToHex(rgb[0], rgb[1], rgb[2]), [rgb]);

  // Update hex input when color changes, unless user is typing
  useEffect(() => {
    if (document.activeElement?.id !== "hex-input") {
      setHexInput(hex);
    }
  }, [hex]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    
    if (/^#?[0-9A-Fa-f]{6}$/.test(val)) {
      const parsedHex = val.startsWith("#") ? val : `#${val}`;
      const rgbVal = hexToRgb(parsedHex);
      if (rgbVal) {
        const hslVal = rgbToHsl(rgbVal[0], rgbVal[1], rgbVal[2]);
        setColor({ h: hslVal[0], s: hslVal[1], l: hslVal[2] });
        addToRecent(parsedHex);
      }
    }
  };

  const handleRgbChange = (channel: "r" | "g" | "b", value: number) => {
    const newRgb = [...rgb] as [number, number, number];
    if (channel === "r") newRgb[0] = value;
    if (channel === "g") newRgb[1] = value;
    if (channel === "b") newRgb[2] = value;
    
    const hslVal = rgbToHsl(newRgb[0], newRgb[1], newRgb[2]);
    setColor({ h: hslVal[0], s: hslVal[1], l: hslVal[2] });
  };

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 1500);
    });
  }, [hex]);

  const addToRecent = useCallback((newHex: string) => {
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== newHex.toLowerCase());
      return [newHex, ...filtered].slice(0, 8);
    });
  }, []);

  const saveColor = useCallback(() => {
    if (!savedColors.includes(hex)) {
      setSavedColors(prev => [...prev, hex]);
    }
  }, [hex, savedColors]);

  const removeSavedColor = useCallback((colorToRemove: string) => {
    setSavedColors(prev => prev.filter(c => c !== colorToRemove));
  }, []);

  const selectColor = useCallback((selectedHex: string) => {
    const rgbVal = hexToRgb(selectedHex);
    if (rgbVal) {
      const hslVal = rgbToHsl(rgbVal[0], rgbVal[1], rgbVal[2]);
      setColor({ h: hslVal[0], s: hslVal[1], l: hslVal[2] });
      addToRecent(selectedHex);
    }
  }, [addToRecent]);

  

  const handleSpectrumClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    // Simple mapping: x = saturation, y = lightness (inverted)
    setColor(prev => ({
      ...prev,
      s: Math.round(x * 100),
      l: Math.round((1 - y) * 100)
    }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Card className="bg-card text-card-foreground border-border shadow-lg overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Palette className="w-6 h-6 text-primary" />
                Advanced Color Picker
              </CardTitle>
              <CardDescription>
                Select, adjust, and manage your color palette
              </CardDescription>
            </div>
            
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: Color Selection */}
            <div className="md:col-span-7 space-y-6">
              {/* Spectrum Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Color Spectrum</Label>
                  <Badge variant="secondary" className="font-mono">{hex.toUpperCase()}</Badge>
                </div>
                
                <div 
                  ref={spectrumRef}
                  className="w-full h-48 rounded-lg cursor-crosshair relative overflow-hidden shadow-inner border border-border"
                  style={{
                    backgroundColor: `hsl(${color.h}, 100%, 50%)`,
                    backgroundImage: `
                      linear-gradient(to top, #000, transparent),
                      linear-gradient(to right, #fff, transparent)
                    `
                  }}
                  onClick={handleSpectrumClick}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) handleSpectrumClick(e);
                  }}
                >
                  <motion.div 
                    className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none"
                    style={{
                      left: `${color.s}%`,
                      top: `${100 - color.l}%`,
                      backgroundColor: hex
                    }}
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                </div>
                
                {/* Hue Slider */}
                <div className="space-y-1.5">
    <div className="flex justify-between">
        <Label className="text-xs">Hue</Label>
        <span className="text-xs font-mono">{color.h}°</span>
    </div>
    <Slider 
        value={[color.h]} 
        min={0} 
        max={360} 
        step={1}
        onValueChange={(vals) => setColor(prev => ({ ...prev, h: vals[0] }))}
        className="hue-slider"
    />
</div>
              </div>

              <Tabs defaultValue="hsl" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="hsl">HSL</TabsTrigger>
                  <TabsTrigger value="rgb">RGB</TabsTrigger>
                  <TabsTrigger value="hex">HEX</TabsTrigger>
                </TabsList>
                
                <TabsContent value="hsl" className="space-y-4 mt-0">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Label className="text-xs">Saturation</Label>
                        <span className="text-xs font-mono">{color.s}%</span>
                      </div>
                      <Slider 
                        value={[color.s]} 
                        min={0} 
                        max={100} 
                        step={1}
                        onValueChange={(vals) => setColor(prev => ({ ...prev, s: vals[0] }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Label className="text-xs">Lightness</Label>
                        <span className="text-xs font-mono">{color.l}%</span>
                      </div>
                      <Slider 
                        value={[color.l]} 
                        min={0} 
                        max={100} 
                        step={1}
                        onValueChange={(vals) => setColor(prev => ({ ...prev, l: vals[0] }))}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="rgb" className="space-y-4 mt-0">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Label className="text-xs text-red-500 font-medium">Red</Label>
                        <span className="text-xs font-mono">{rgb[0]}</span>
                      </div>
                      <Slider 
                        value={[rgb[0]]} 
                        min={0} 
                        max={255} 
                        step={1}
                        onValueChange={(vals) => handleRgbChange("r", vals[0])}
                        className="[&_[role=slider]]:border-red-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Label className="text-xs text-green-500 font-medium">Green</Label>
                        <span className="text-xs font-mono">{rgb[1]}</span>
                      </div>
                      <Slider 
                        value={[rgb[1]]} 
                        min={0} 
                        max={255} 
                        step={1}
                        onValueChange={(vals) => handleRgbChange("g", vals[0])}
                        className="[&_[role=slider]]:border-green-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Label className="text-xs text-blue-500 font-medium">Blue</Label>
                        <span className="text-xs font-mono">{rgb[2]}</span>
                      </div>
                      <Slider 
                        value={[rgb[2]]} 
                        min={0} 
                        max={255} 
                        step={1}
                        onValueChange={(vals) => handleRgbChange("b", vals[0])}
                        className="[&_[role=slider]]:border-blue-500"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="hex" className="mt-0">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hex-input">Hex Color Code</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                            #
                          </div>
                          <Input
                            id="hex-input"
                            value={hexInput.replace("#", "")}
                            onChange={handleHexInputChange}
                            className="pl-7 font-mono uppercase"
                            maxLength={6}
                          />
                        </div>
                        <Button 
                          variant="secondary" 
                          onClick={copyToClipboard}
                          className="w-24"
                        >
                          {copiedStatus ? <><Check className="w-4 h-4 mr-2 text-green-500" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column: Preview & Palettes */}
            <div className="md:col-span-5 space-y-6">
              {/* Large Preview */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Preview</Label>
                <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                  <motion.div 
                    className="h-32 w-full flex items-end justify-end p-3"
                    style={{ backgroundColor: hex }}
                    layout
                  >
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                      onClick={saveColor}
                      disabled={savedColors.includes(hex)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Save Color
                    </Button>
                  </motion.div>
                  <div className="bg-muted/30 p-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs block">HEX</span>
                      <span className="font-mono font-medium">{hex.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">RGB</span>
                      <span className="font-mono font-medium">{rgb.join(", ")}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs block">HSL</span>
                      <span className="font-mono font-medium">{color.h}°, {color.s}%, {color.l}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium text-foreground">Recently Used</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {recentColors.map((c, i) => (
                      <motion.button
                        key={`recent-${c}-${i}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-8 h-8 rounded-full border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        style={{ backgroundColor: c }}
                        onClick={() => selectColor(c)}
                        title={c}
                        aria-label={`Select recent color ${c}`}
                      />
                    ))}
                  </AnimatePresence>
                  {recentColors.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">No recent colors</span>
                  )}
                </div>
              </div>

              {/* Saved Palette */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium text-foreground">Saved Palette</Label>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {savedColors.length} colors
                  </Badge>
                </div>
                
                <div className="bg-muted/20 border border-border rounded-lg p-3 h-48 overflow-y-auto">
                  <div className="grid grid-cols-5 gap-2">
                    <AnimatePresence>
                      {savedColors.map((c) => (
                        <motion.div
  layout
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.8 }}
  className="relative group aspect-square"
  key={`saved-${c}`}>
  <button
    className="w-full h-full rounded-md border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    style={{ backgroundColor: c }}
    onClick={() => selectColor(c)}
    aria-label={`Select saved color ${c}`}
    title={c.toUpperCase()}
  />
  <button
    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md"
    onClick={(e) => { e.stopPropagation(); removeSavedColor(c); }}
    aria-label={`Remove color ${c}`}>
    <Trash2 className="w-3 h-3" />
  </button>
</motion.div>
                      ))}
                    </AnimatePresence>
                    {savedColors.length === 0 && (
                      <div className="col-span-5 flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Palette className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-sm">No saved colors yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
