import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BrainCircuit, Clock, Layers, Plus, Pencil, Trash2, Link as LinkIcon } from "lucide-react";

type MemoryType = "short-term" | "long-term" | "episodic";

type MemoryEntry = {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: number;
  related: string[];
  decay: number; // 0 to 1, 1 is fresh
};

const mockMemories: MemoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
  id: `mem-${i + 1}`,
  type: (["short-term", "long-term", "episodic"] as MemoryType[])[i % 3],
  content: `This is memory entry #${i + 1}. It contains some details about a past interaction or a piece of learned information. For example, user preference for dark mode.`,
  timestamp: Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30, // within last 30 days
  related: i > 2 ? [`mem-${i - 1}`, `mem-${i - 2}`] : [],
  decay: Math.random(),
}));

export default function AgentMemoryViewer() {
  const [memories, setMemories] = useState<MemoryEntry[]>(mockMemories);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(memories[0]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<MemoryType | "all">("all");

  const filteredMemories = useMemo(() => {
    return memories
      .filter((m) => activeTab === "all" || m.type === activeTab)
      .filter((m) => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [memories, activeTab, searchTerm]);

  const memoryCapacity = useMemo(() => memories.length / 50, [memories]); // Max 50 memories

  const handleSelectMemory = useCallback((memory: MemoryEntry) => {
    setSelectedMemory(memory);
  }, []);

  const ConnectionGraph = ({ entry }: { entry: MemoryEntry }) => {
      if (!entry.related.length) return null;
      const relatedEntries = entry.related.map(id => memories.find(m => m.id === id)).filter(Boolean) as MemoryEntry[];

      return (
          <div className="mt-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Memory Links</h4>
              <div className="flex flex-wrap gap-2">
                  {relatedEntries.map(rel => (
                      <Badge key={rel.id} variant="secondary" className="cursor-pointer" onClick={() => handleSelectMemory(rel)}>
                          <LinkIcon className="w-3 h-3 mr-1" />
                          {rel.id}
                      </Badge>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <Card className="w-full h-[700px] bg-background text-foreground border-border flex flex-col p-4 gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6" />
            <h1 className="text-xl font-bold">Agent Memory</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Add</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left Panel: Filters and Memory List */}
        <div className="md:col-span-1 flex flex-col gap-4 h-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                    placeholder="Search memories..." 
                    className="pl-9 bg-muted"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
            </div>
            <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as MemoryType | "all")} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="short-term">Short</TabsTrigger>
                    <TabsTrigger value="long-term">Long</TabsTrigger>
                    <TabsTrigger value="episodic">Episodic</TabsTrigger>
                </TabsList>
            </Tabs>
            <ScrollArea className="flex-1 pr-3">
                <div className="space-y-2">
                    {filteredMemories.map(memory => (
                        <motion.div
                            key={memory.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => handleSelectMemory(memory)}
                            className={cn(
                                "p-3 rounded-lg cursor-pointer border transition-colors",
                                selectedMemory?.id === memory.id ? "bg-muted border-primary" : "hover:bg-muted/50 border-transparent"
                            )}
                            style={{ opacity: 0.5 + memory.decay * 0.5 }}
                        >
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-medium truncate pr-4">{memory.content}</p>
                                <Badge variant={memory.type === 'short-term' ? 'default' : memory.type === 'long-term' ? 'secondary' : 'outline'} className="capitalize text-xs shrink-0">{memory.type.split('-')[0]}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(memory.timestamp).toLocaleString()}</p>
                        </motion.div>
                    ))}
                </div>
            </ScrollArea>
        </div>

        {/* Right Panel: Details */}
        <div className="md:col-span-2 flex flex-col gap-4 h-full">
            <AnimatePresence mode="wait">
                {selectedMemory ? (
                    <motion.div 
                        key={selectedMemory.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-muted/50 rounded-lg p-6 flex-1 flex flex-col h-full"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <Badge variant={selectedMemory.type === 'short-term' ? 'default' : selectedMemory.type === 'long-term' ? 'secondary' : 'outline'} className="capitalize">{selectedMemory.type}</Badge>
                                <p className="text-xs text-muted-foreground mt-2 flex items-center"><Clock className="w-3 h-3 mr-1.5" /> {new Date(selectedMemory.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 -mx-6">
                            <p className="text-base leading-relaxed whitespace-pre-wrap px-6">{selectedMemory.content}</p>
                        </ScrollArea>
                        <ConnectionGraph entry={selectedMemory} />
                    </motion.div>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-muted/50 rounded-lg">
                        <p className="text-muted-foreground">Select a memory to view details</p>
                    </div>
                )}
            </AnimatePresence>
            <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center justify-between">
                        <span>Memory Capacity</span>
                        <span className="text-sm text-muted-foreground">{memories.length} / 50</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full bg-background rounded-full h-2.5">
                        <motion.div 
                            className="bg-primary h-2.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${memoryCapacity * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </Card>
  );
}
