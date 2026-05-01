import React, { useState, useMemo, useCallback } from 'react';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, History, ShieldAlert, PlusCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

// --- DATA STRUCTURES ---
type Environment = "development" | "staging" | "production";

type FeatureFlag = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environments: Partial<Record<Environment, boolean>>;
  targetedUsers: string[];
  history: Array<{ timestamp: Date; action: string; user: string }>;
};

// --- MOCK DATA ---
const mockFeatureFlags: FeatureFlag[] = [
  {
    id: "ff-001",
    name: "New Dashboard UI",
    description: "Enables the redesigned dashboard layout and widgets.",
    enabled: true,
    rolloutPercentage: 100,
    environments: { production: true, staging: true, development: true },
    targetedUsers: ["user1@example.com", "user2@example.com"],
    history: [
      { timestamp: new Date("2026-04-20T10:00:00Z"), action: "Created", user: "admin" },
      { timestamp: new Date("2026-04-21T14:30:00Z"), action: "Enabled in Production", user: "admin" },
    ],
  },
  {
    id: "ff-002",
    name: "Real-time Collaboration",
    description: "Allows multiple users to edit documents simultaneously.",
    enabled: true,
    rolloutPercentage: 50,
    environments: { staging: true, development: true },
    targetedUsers: [],
    history: [
        { timestamp: new Date("2026-04-15T09:00:00Z"), action: "Created", user: "dev_ops" },
    ],
  },
  {
    id: "ff-003",
    name: "AI-Powered Suggestions",
    description: "Provides AI-driven content recommendations.",
    enabled: false,
    rolloutPercentage: 0,
    environments: { development: true },
    targetedUsers: ["dev-team@example.com"],
    history: [
        { timestamp: new Date("2026-04-18T11:00:00Z"), action: "Created", user: "ml_engineer" },
    ],
  },
  {
    id: "ff-004",
    name: "API V3",
    description: "Exposes the new version 3 of the public API.",
    enabled: true,
    rolloutPercentage: 10,
    environments: { production: false, staging: true, development: true },
    targetedUsers: ["partner-a@example.com"],
    history: [
        { timestamp: new Date("2026-03-30T16:00:00Z"), action: "Created", user: "backend_lead" },
    ],
  },
  {
    id: "ff-005",
    name: "Dark Mode",
    description: "Enables the dark theme for the entire application.",
    enabled: false,
    rolloutPercentage: 0,
    environments: {},
    targetedUsers: [],
    history: [
        { timestamp: new Date("2026-05-01T12:00:00Z"), action: "Created", user: "frontend_dev" },
    ],
  },
  {
    id: "ff-006",
    name: "Enhanced Security Module",
    description: "Activates two-factor authentication and other security features.",
    enabled: true,
    rolloutPercentage: 100,
    environments: { production: true, staging: true, development: true },
    targetedUsers: [],
    history: [
        { timestamp: new Date("2026-02-10T08:00:00Z"), action: "Created", user: "security_analyst" },
    ],
  },
  {
    id: "ff-007",
    name: "Onboarding Tutorial",
    description: "Shows a guided tour for new users.",
    enabled: true,
    rolloutPercentage: 75,
    environments: { production: true, staging: true, development: true },
    targetedUsers: [],
    history: [
        { timestamp: new Date("2026-04-25T18:00:00Z"), action: "Created", user: "product_manager" },
    ],
  },
  {
    id: "ff-008",
    name: "Experimental Feature X",
    description: "A highly experimental and unstable feature for internal testing.",
    enabled: false,
    rolloutPercentage: 5,
    environments: { development: true },
    targetedUsers: ["qa-team@example.com"],
    history: [
        { timestamp: new Date("2026-04-28T15:00:00Z"), action: "Created", user: "rd_team" },
    ],
  },
];

const FeatureFlagItem: React.FC<{ flag: FeatureFlag; onUpdate: (id: string, updates: Partial<FeatureFlag>) => void }> = ({ flag, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [userToAdd, setUserToAdd] = useState("");

    const handleAddUser = () => {
        if (userToAdd && !flag.targetedUsers.includes(userToAdd)) {
            onUpdate(flag.id, { targetedUsers: [...flag.targetedUsers, userToAdd] });
            setUserToAdd("");
        }
    };

    const handleRemoveUser = (user: string) => {
        onUpdate(flag.id, { targetedUsers: flag.targetedUsers.filter(u => u !== user) });
    };

    return (
        <motion.div layout initial={{ borderRadius: 8 }} className="bg-card border border-border p-4 rounded-lg">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-4">
                    <Switch
                        checked={flag.enabled}
                        onCheckedChange={(checked: boolean) => onUpdate(flag.id, { enabled: checked })}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        aria-label={`Toggle ${flag.name}`}
                    />
                    <div>
                        <p className="font-semibold text-foreground">{flag.name}</p>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {Object.entries(flag.environments).map(([env, enabled]) => (
                        enabled && <Badge key={env} variant="outline" className="capitalize">{env}</Badge>
                    ))}
                    <Button variant="ghost" size="sm">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <Separator className="my-4" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-semibold">Environment Overrides</h4>
                                {(["development", "staging", "production"] as Environment[]).map(env => (
                                    <div key={env} className="flex items-center justify-between">
                                        <Label htmlFor={`${flag.id}-${env}`} className="capitalize">{env}</Label>
                                        <Switch
                                            id={`${flag.id}-${env}`}
                                            checked={flag.environments[env] ?? false}
                                            onCheckedChange={(checked: boolean) => {
                                                const newEnvironments = { ...flag.environments, [env]: checked };
                                                onUpdate(flag.id, { environments: newEnvironments });
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-semibold">Rollout Percentage</h4>
                                <div className="flex items-center gap-4">
                                    <Slider
                                        value={[flag.rolloutPercentage]}
                                        onValueChange={([value]: number[]) => onUpdate(flag.id, { rolloutPercentage: value })}
                                        max={100}
                                        step={1}
                                    />
                                    <span className="font-mono text-sm w-12 text-right">{flag.rolloutPercentage}%</span>
                                </div>
                                <h4 className="font-semibold pt-4">User Targeting</h4>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="user@example.com"
                                        value={userToAdd}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserToAdd(e.target.value)}
                                    />
                                    <Button onClick={handleAddUser}>Add</Button>
                                </div>
                                <div className="space-y-2">
                                    {flag.targetedUsers.map(user => (
                                        <div key={user} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                            <span className="text-sm truncate">{user}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveUser(user)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-semibold">History</h4>
                                <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                                    {flag.history.map((entry, index) => (
                                        <div key={index} className="text-sm">
                                            <p className="font-medium">{entry.action}</p>
                                            <p className="text-muted-foreground">{entry.timestamp.toLocaleString()} by {entry.user}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function FeatureFlagManager() {
    const [flags, setFlags] = useState<FeatureFlag[]>(mockFeatureFlags);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [newFlag, setNewFlag] = useState({ name: "", description: "" });

    const handleUpdateFlag = useCallback((id: string, updates: Partial<FeatureFlag>) => {
        setFlags(currentFlags =>
            currentFlags.map(f => (f.id === id ? { ...f, ...updates, history: [...f.history, { timestamp: new Date(), action: `Updated: ${Object.keys(updates).join(', ')}`, user: "currentUser" }] } : f))
        );
    }, []);

    const handleCreateFlag = () => {
        if (newFlag.name && newFlag.description) {
            const newFlagData: FeatureFlag = {
                id: `ff-${Date.now()}`,
                name: newFlag.name,
                description: newFlag.description,
                enabled: false,
                rolloutPercentage: 0,
                environments: {},
                targetedUsers: [],
                history: [{ timestamp: new Date(), action: "Created", user: "currentUser" }],
            };
            setFlags(currentFlags => [newFlagData, ...currentFlags]);
            setCreateDialogOpen(false);
            setNewFlag({ name: "", description: "" });
        }
    };

    const handleKillSwitch = () => {
        setFlags(currentFlags => 
            currentFlags.map(f => ({ ...f, enabled: false, history: [...f.history, { timestamp: new Date(), action: "Disabled by Kill Switch", user: "currentUser" }] }))
        );
    };

    const filteredFlags = useMemo(() => {
        return flags.filter(flag =>
            flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            flag.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [flags, searchTerm]);

    return (
        <TooltipProvider>
            <div className="bg-background text-foreground p-6 font-sans min-h-screen">
                <Card className="w-full max-w-6xl mx-auto bg-muted/20 border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-2xl font-bold">Feature Flag Manager</CardTitle>
                        <div className="flex items-center gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="destructive">
                                        <ShieldAlert className="mr-2 h-4 w-4" />
                                        Kill Switch
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Confirm Global Kill Switch</DialogTitle>
                                        <DialogDescription>
                                            This will disable all feature flags across all environments. This action cannot be undone.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant="outline">Cancel</Button>
                                        <Button variant="destructive" onClick={handleKillSwitch}>Confirm & Disable All</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create Flag
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Feature Flag</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right">Name</Label>
                                            <Input id="name" value={newFlag.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFlag({...newFlag, name: e.target.value})} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="description" className="text-right">Description</Label>
                                            <Input id="description" value={newFlag.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFlag({...newFlag, description: e.target.value})} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreateFlag}>Create</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search flags by name or description..."
                                    className="pl-10 w-full"
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">
                                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                                        Filter
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56">
                                    <p className="text-sm text-muted-foreground">Filter options coming soon.</p>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {filteredFlags.map(flag => (
                                    <FeatureFlagItem key={flag.id} flag={flag} onUpdate={handleUpdateFlag} />
                                ))}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
