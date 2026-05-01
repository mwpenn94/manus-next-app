import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Palette, Trash2, Upload, Download, Undo, Check, Copy, Save, X } from 'lucide-react';

// Type definitions
export type ThemeConfig = {
  primary: string;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  border: string;
  card: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  colors: ThemeConfig;
  preview?: string; // Optional base64 or URL for a more complex preview image
  isCustom?: boolean;
};

// Props
type WorkspaceThemePickerProps = {
  currentTheme: ThemeConfig;
  presets: ThemePreset[];
  onApply: (theme: ThemeConfig) => void;
  onSavePreset: (name: string, theme: ThemeConfig) => void;
  onDeletePreset: (id: string) => void;
};

const ColorPicker: React.FC<{ color: string; onChange: (color: string) => void }> = ({ color, onChange }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          className="w-8 h-8 rounded-md border border-border shrink-0"
          style={{ backgroundColor: color }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-2">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 p-0 border-none cursor-pointer bg-transparent"
          />
           <Input
              className="mt-2"
              value={color}
              onChange={(e) => onChange(e.target.value)}
            />
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ThemePreview: React.FC<{ theme: ThemeConfig; mode: 'light' | 'dark' }> = ({ theme, mode }) => {
  const previewTheme = useMemo(() => {
    if (mode === 'light') {
        return theme;
    }
    // Simple inversion for dark mode preview, can be more sophisticated
    return {
        ...theme,
        background: '#1a1a1a',
        foreground: '#f0f0f0',
        card: '#2a2a2a',
        border: '#3a3a3a',
    };
  }, [theme, mode]);

  const style = {
    '--primary': previewTheme.primary,
    '--background': previewTheme.background,
    '--foreground': previewTheme.foreground,
    '--accent': previewTheme.accent,
    '--muted': previewTheme.muted,
    '--border': previewTheme.border,
    '--card': previewTheme.card,
  } as React.CSSProperties;

  return (
    <motion.div 
        className="p-4 rounded-lg border bg-background text-foreground transition-colors duration-300"
        style={style}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" as const }}
    >
      <h3 className="text-lg font-semibold mb-2 text-[var(--foreground)]">Live Preview</h3>
      <div className="space-y-2">
        <Button style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground, white)' }}>Primary Button</Button>
        <div className="p-3 rounded-md" style={{ backgroundColor: 'var(--card)', border: `1px solid var(--border)` }}>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>This is a card.</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>With some muted text.</p>
        </div>
        <div className="p-2 rounded-md" style={{ backgroundColor: 'var(--accent)' }}>
            <p className="text-sm" style={{ color: 'var(--accent-foreground, black)' }}>Accent background</p>
        </div>
      </div>
    </motion.div>
  );
};

export const WorkspaceThemePicker: React.FC<WorkspaceThemePickerProps> = ({ 
    currentTheme,
    presets,
    onApply,
    onSavePreset,
    onDeletePreset
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig>(currentTheme);
  const [previewPresetId, setPreviewPresetId] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetClick = (preset: ThemePreset) => {
    setSelectedTheme(preset.colors);
    setPreviewPresetId(preset.id);
  };

  const handleColorChange = (colorName: keyof ThemeConfig, value: string) => {
    setSelectedTheme(prev => ({ ...prev, [colorName]: value }));
    setPreviewPresetId(null); // Customizing, so no preset is active for preview
  };

  const handleApply = () => {
    onApply(selectedTheme);
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName.trim(), selectedTheme);
      setNewPresetName("");
    }
  };

  const handleReset = () => {
    const defaultPreset = presets.find(p => p.id === 'default');
    if (defaultPreset) {
        setSelectedTheme(defaultPreset.colors);
        setPreviewPresetId('default');
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(selectedTheme, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workspace-theme.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTheme = JSON.parse(e.target?.result as string);
          // Basic validation
          if (Object.keys(importedTheme).every(key => Object.keys(selectedTheme).includes(key))) {
            setSelectedTheme(importedTheme);
            setPreviewPresetId(null);
          }
        } catch (error) {
          console.error("Failed to parse theme file", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const cardVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center"><Palette className="mr-2" /> Workspace Theme</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Presets & Customization */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Presets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {presets.map(preset => (
                <motion.div key={preset.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Card 
                    className={cn(
                        "cursor-pointer transition-all",
                        previewPresetId === preset.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:border-primary/50"
                    )}
                    onClick={() => handlePresetClick(preset)}
                  >
                    <CardHeader className="p-2">
                      <div className="flex justify-center space-x-1 p-2 rounded-md bg-muted/50">
                        {Object.values(preset.colors).slice(0, 5).map((color, i) => (
                          <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 pt-0 text-center">
                      <p className="text-sm font-medium">{preset.name}</p>
                      {preset.isCustom && (
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={(e) => { e.stopPropagation(); onDeletePreset(preset.id); }}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Custom Editor</h3>
            <div className="space-y-3">
              {Object.entries(selectedTheme).map(([name, color]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="capitalize text-sm font-medium">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{color}</span>
                    <ColorPicker color={color} onChange={(newColor) => handleColorChange(name as keyof ThemeConfig, newColor)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Preview & Actions */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <ThemePreview key={mode + JSON.stringify(selectedTheme)} theme={selectedTheme} mode={mode} />
          </AnimatePresence>
          <div className="flex justify-center">
              <div className="flex items-center gap-2 p-1 rounded-full bg-muted">
                  <Button size="sm" variant={mode === 'light' ? 'secondary' : 'ghost'} onClick={() => setMode('light')}>Light</Button>
                  <Button size="sm" variant={mode === 'dark' ? 'secondary' : 'ghost'} onClick={() => setMode('dark')}>Dark</Button>
              </div>
          </div>
          
          <div className="space-y-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline"><Save className="mr-2 h-4 w-4" /> Save as Preset</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Custom Preset</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input 
                    placeholder="Preset name (e.g., Neon Dreams)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>Save</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            </div>
            <Button variant="ghost" className="w-full" onClick={handleReset}><Undo className="mr-2 h-4 w-4" /> Reset to Default</Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button size="lg" onClick={handleApply}><Check className="mr-2 h-4 w-4" /> Apply Theme</Button>
      </CardFooter>
    </Card>
  );
};