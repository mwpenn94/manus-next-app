import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

import { Settings, Bot, Palette, Bell, ShieldAlert, FileUp, FileDown, RotateCcw } from 'lucide-react'

interface WorkspaceSettings {
  name: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens: number;
  autoSave: boolean;
  theme: string;
  notifications: boolean;
  language: string;
  timezone: string;
}

interface Model {
  id: string;
  name: string;
  description: string;
}

interface WorkspaceSettingsPanelProps {
  settings: WorkspaceSettings;
  onUpdate: (key: keyof WorkspaceSettings, value: unknown) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (config: unknown) => void;
  availableModels: Model[];
}

const navItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'model', label: 'Model', icon: Bot },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'advanced', label: 'Advanced', icon: ShieldAlert },
] as const;

type NavItemId = typeof navItems[number]['id'];

export const WorkspaceSettingsPanel: React.FC<WorkspaceSettingsPanelProps> = ({ 
  settings,
  onUpdate,
  onReset,
  onExport,
  onImport,
  availableModels
}) => {
  const [activeSection, setActiveSection] = useState<NavItemId>('general');
  const [isResetting, setIsResetting] = useState(false);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          onImport(config);
        } catch (error) {
          console.error("Failed to parse imported config:", error);
          // Optionally, show an error to the user
        }
      };
      reader.readAsText(file);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input id="ws-name" value={settings.name} onChange={(e) => onUpdate('name', e.target.value)} />
              <p className="text-sm text-muted-foreground">The name of your workspace.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-description">Description</Label>
              <Input id="ws-description" value={settings.description} onChange={(e) => onUpdate('description', e.target.value)} />
              <p className="text-sm text-muted-foreground">A brief description of the workspace's purpose.</p>
            </div>
          </div>
        );
      case 'model':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={settings.model} onValueChange={(value) => onUpdate('model', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">The AI model to use for generating responses.</p>
            </div>
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Slider
                value={[settings.temperature]}
                onValueChange={([value]) => onUpdate('temperature', value)}
                max={1}
                step={0.1}
              />
              <p className="text-sm text-muted-foreground">Controls randomness. Lower is more deterministic. Current: {settings.temperature}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-max-tokens">Max Tokens</Label>
              <Input id="ws-max-tokens" type="number" value={settings.maxTokens} onChange={(e) => onUpdate('maxTokens', parseInt(e.target.value, 10) || 0)} />
              <p className="text-sm text-muted-foreground">The maximum number of tokens to generate.</p>
            </div>
          </div>
        );
      case 'appearance':
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={settings.theme} onValueChange={(value) => onUpdate('theme', value)}>
                        <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Choose the application's color theme.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label>Auto-Save</Label>
                        <p className="text-sm text-muted-foreground">Automatically save changes as you make them.</p>
                    </div>
                    <Switch checked={settings.autoSave} onCheckedChange={(checked) => onUpdate('autoSave', checked)} />
                </div>
            </div>
        );
      case 'notifications':
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label>Enable Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications for important events.</p>
                    </div>
                    <Switch checked={settings.notifications} onCheckedChange={(checked) => onUpdate('notifications', checked)} />
                </div>
            </div>
        );
      case 'advanced':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium">Configuration</h3>
              <p className="text-sm text-muted-foreground">Export or import your workspace configuration.</p>
              <div className="mt-4 flex space-x-2">
                <Button variant="outline" onClick={onExport}><FileDown className="mr-2 h-4 w-4" /> Export</Button>
                <Button variant="outline" asChild>
                  <Label htmlFor="import-config" className="cursor-pointer">
                    <FileUp className="mr-2 h-4 w-4" /> Import
                    <input id="import-config" type="file" className="sr-only" accept=".json" onChange={handleFileImport} />
                  </Label>
                </Button>
              </div>
            </div>
            <Separator />
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground text-destructive/80">These actions are irreversible. Please proceed with caution.</p>
              <div className="mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive"><RotateCcw className="mr-2 h-4 w-4" /> Reset to Defaults</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Are you sure?</DialogTitle>
                      <DialogDescription>
                        This will reset all workspace settings to their default values. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="destructive" onClick={onReset}>Reset</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 flex">
      <div className="w-1/4 border-r border-border p-4">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <nav className="flex flex-col space-y-1">
          {navItems.map(item => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
      <div className="w-3/4 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeInOut" as const }}
          >
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-2xl">{navItems.find(i => i.id === activeSection)?.label}</CardTitle>
              <CardDescription>Manage your {navItems.find(i => i.id === activeSection)?.label.toLowerCase()} settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderSection()}
            </CardContent>
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}
