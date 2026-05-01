import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Plus, Trash2, TestTube, ShieldAlert, Check, ChevronsUpDown, X } from "lucide-react";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  lastTriggered?: number;
  failureCount: number;
}

interface WebhookConfiguratorProps {
  webhooks: Webhook[];
  availableEvents: string[];
  onAdd: (webhook: { url: string; events: string[]; secret?: string }) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onTest: (id: string) => void;
}

const AddWebhookDialog: React.FC<{
  availableEvents: string[];
  onAdd: (webhook: { url: string; events: string[]; secret?: string }) => void;
  children: React.ReactNode;
}> = ({ availableEvents, onAdd, children }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [secret, setSecret] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleAdd = () => {
    if (url && selectedEvents.size > 0) {
      onAdd({ url, events: Array.from(selectedEvents), secret: secret || undefined });
      setUrl('');
      setSelectedEvents(new Set());
      setSecret('');
      setOpen(false);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(event)) {
        newSet.delete(event);
      } else {
        newSet.add(event);
      }
      return newSet;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Webhook</DialogTitle>
          <DialogDescription>
            Configure a new endpoint to receive webhook events.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="url" className="text-right">URL</label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" placeholder="https://example.com/webhook" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="events" className="text-right">Events</label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={popoverOpen} className="col-span-3 justify-between">
                  {selectedEvents.size > 0 ? `${selectedEvents.size} selected` : "Select events..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[375px] p-0">
                <Command>
                  <CommandInput placeholder="Search events..." />
                  <CommandList>
                    <CommandEmpty>No events found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-48">
                        {availableEvents.map((event) => (
                          <CommandItem
                            key={event}
                            value={event}
                            onSelect={() => {
                              toggleEvent(event);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedEvents.has(event) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {event}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {selectedEvents.size > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
                <div className="col-start-2 col-span-3 flex flex-wrap gap-1">
                    {Array.from(selectedEvents).map(event => (
                        <Badge key={event} variant="secondary">
                            {event}
                            <button onClick={() => toggleEvent(event)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="secret" className="text-right">Secret</label>
            <Input id="secret" value={secret} onChange={(e) => setSecret(e.target.value)} className="col-span-3" placeholder="Optional signing secret" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAdd} disabled={!url || selectedEvents.size === 0}>Add Webhook</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const WebhookConfigurator: React.FC<WebhookConfiguratorProps> = ({ webhooks, availableEvents, onAdd, onDelete, onToggle, onTest }) => {
  const [filter, setFilter] = useState('');

  const filteredWebhooks = useMemo(() => {
    if (!filter) return webhooks;
    return webhooks.filter(wh => 
      wh.url.toLowerCase().includes(filter.toLowerCase()) ||
      wh.events.some(e => e.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [webhooks, filter]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Webhooks</CardTitle>
          <AddWebhookDialog availableEvents={availableEvents} onAdd={onAdd}>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Webhook</Button>
          </AddWebhookDialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
              placeholder="Filter webhooks by URL or event..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <AnimatePresence>
              {filteredWebhooks.map(webhook => (
                <motion.div
                  key={webhook.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeInOut" as const }}
                >
                  <Card>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="flex-grow space-y-2">
                        <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-semibold">{webhook.url}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map(event => (
                            <Badge key={event} variant="outline">{event}</Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-4 pt-1">
                          <span>Last triggered: {formatTimestamp(webhook.lastTriggered)}</span>
                          <div className="flex items-center gap-1">
                            {webhook.failureCount > 0 && <ShieldAlert className={cn("h-4 w-4", webhook.failureCount > 5 ? "text-destructive" : "text-amber-500")} />}
                            <span>{webhook.failureCount} failures</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <Switch
                          checked={webhook.isActive}
                          onCheckedChange={(active) => onToggle(webhook.id, active)}
                          aria-label="Toggle webhook active state"
                        />
                        <Button variant="ghost" size="icon" onClick={() => onTest(webhook.id)}>
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the webhook endpoint at <span className="font-mono">{webhook.url}</span>. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(webhook.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredWebhooks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No webhooks configured{filter ? " matching your filter" : ""}.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
