import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Star, Download, ChevronDown, X, Package, Trash2, Loader2, Grip, List } from 'lucide-react';

// --- TYPES --- //

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  category: string;
}

export interface InstalledPlugin extends Plugin {
  enabled: boolean;
}

export interface AvailablePlugin extends Plugin {
  downloads: number;
  rating: number;
}

export interface AgentPluginRegistryProps {
  installedPlugins: InstalledPlugin[];
  availablePlugins: AvailablePlugin[];
  onInstall: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
  onToggle: (pluginId: string, enabled: boolean) => void;
}

// --- HELPER COMPONENTS --- //

const formatDownloads = (downloads: number): string => {
  if (downloads >= 1000000) {
    return `${(downloads / 1000000).toFixed(1)}m`;
  }
  if (downloads >= 1000) {
    return `${(downloads / 1000).toFixed(1)}k`;
  }
  return downloads.toString();
};

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/50'
        )}
      />
    ))}
  </div>
);

const PluginIcon: React.FC<{ icon?: string; name: string }> = ({ icon, name }) => {
  if (icon) {
    return <img src={icon} alt={`${name} icon`} className="w-12 h-12 rounded-lg object-cover" />;
  }
  return (
    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
      <Package className="w-6 h-6 text-muted-foreground" />
    </div>
  );
};

// --- MAIN COMPONENTS --- //

const PluginCard: React.FC<{
  plugin: AvailablePlugin;
  onInstall: (pluginId: string) => void;
  onSelect: (plugin: AvailablePlugin) => void;
  isInstalling: boolean;
}> = ({ plugin, onInstall, onSelect, isInstalling }) => (
  <motion.div
    whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
    className="cursor-pointer"
    onClick={() => onSelect(plugin)}
  >
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <PluginIcon icon={plugin.icon} name={plugin.name} />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-semibold">{plugin.name}</CardTitle>
            <Badge variant="outline">v{plugin.version}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">by {plugin.author}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        <CardDescription className="text-sm line-clamp-2 h-[40px]">{plugin.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            <span>{formatDownloads(plugin.downloads)}</span>
          </div>
          <RatingStars rating={plugin.rating} />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onInstall(plugin.id); }}
          disabled={isInstalling}
        >
          {isInstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install'}
        </Button>
      </CardFooter>
    </Card>
  </motion.div>
);

const PluginListItem: React.FC<{
  plugin: InstalledPlugin;
  onUninstall: () => void;
  onToggle: (enabled: boolean) => void;
}> = ({ plugin, onUninstall, onToggle }) => (
  <div className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
    <PluginIcon icon={plugin.icon} name={plugin.name} />
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{plugin.name}</h3>
        <Badge variant="secondary">v{plugin.version}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{plugin.description}</p>
      <p className="text-xs text-muted-foreground mt-1">by {plugin.author}</p>
    </div>
    <div className="flex items-center gap-4">
      <Switch checked={plugin.enabled} onCheckedChange={onToggle} />
      <Button variant="ghost" size="icon" onClick={onUninstall}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  </div>
);

const PluginDetailDialog: React.FC<{
  plugin: AvailablePlugin | InstalledPlugin | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ plugin, isOpen, onClose }) => {
  if (!plugin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <PluginIcon icon={plugin.icon} name={plugin.name} />
            <div>
              <DialogTitle className="text-2xl">{plugin.name}</DialogTitle>
              <p className="text-muted-foreground">by {plugin.author}</p>
            </div>
            <Badge variant="outline" className="ml-auto">v{plugin.version}</Badge>
          </div>
        </DialogHeader>
        <div className="py-4 grid gap-6">
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-muted-foreground">{plugin.description}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Permissions</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
              <li>Access your agent's memory</li>
              <li>Perform web searches</li>
              <li>Execute code in a sandboxed environment</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Changelog</h4>
            <p className="text-muted-foreground text-sm">v{plugin.version} - Initial release.</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UninstallConfirmationDialog: React.FC<{
  plugin: InstalledPlugin | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ plugin, isOpen, onClose, onConfirm }) => {
  if (!plugin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uninstall {plugin.name}?</DialogTitle>
          <DialogDescription>
            Are you sure you want to uninstall this plugin? All associated data will be removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>Uninstall</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AgentPluginRegistry: React.FC<AgentPluginRegistryProps> = ({
  installedPlugins,
  availablePlugins,
  onInstall,
  onUninstall,
  onToggle,
}) => {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'newest'>('downloads');
  const [installingPluginId, setInstallingPluginId] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<AvailablePlugin | InstalledPlugin | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<InstalledPlugin | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleInstall = (pluginId: string) => {
    setInstallingPluginId(pluginId);
    // Simulate installation delay
    setTimeout(() => {
      onInstall(pluginId);
      setInstallingPluginId(null);
    }, 1500);
  };

  const handleUninstallConfirm = () => {
    if (uninstallTarget) {
      onUninstall(uninstallTarget.id);
      setUninstallTarget(null);
    }
  };

  const categories = useMemo(() => 
    ['All', ...Array.from(new Set(availablePlugins.map(p => p.category)))]
  , [availablePlugins]);

  const filteredAndSortedPlugins = useMemo(() => {
    let plugins = availablePlugins
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(p => selectedCategory === 'All' || p.category === selectedCategory);

    return plugins.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return 0; // Assuming newest is default order
      return b.downloads - a.downloads;
    });
  }, [availablePlugins, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="browse">Browse</TabsTrigger>
        </TabsList>
        <TabsContent value="installed">
          <Card>
            <CardHeader>
              <CardTitle>Installed Plugins</CardTitle>
              <CardDescription>Manage your installed plugins.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {installedPlugins.length > 0 ? (
                <div>
                  {installedPlugins.map(plugin => (
                    <PluginListItem
                      key={plugin.id}
                      plugin={plugin}
                      onToggle={(enabled) => onToggle(plugin.id, enabled)}
                      onUninstall={() => setUninstallTarget(plugin)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No plugins installed yet.</p>
                  <Button variant="link" onClick={() => setActiveTab('browse')}>Browse available plugins</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="browse">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search plugins..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-between">
                      {selectedCategory} <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {categories.map(cat => (
                      <DropdownMenuItem key={cat} onSelect={() => setSelectedCategory(cat)}>{cat}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-between">
                      Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSortBy('downloads')}>Downloads</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSortBy('rating')}>Rating</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSortBy('newest')}>Newest</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center rounded-md border bg-background p-0.5">
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}><Grip className="w-4 h-4" /></Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
            <AnimatePresence>
              {viewMode === 'grid' ? (
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedPlugins.map(plugin => (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin}
                      onInstall={handleInstall}
                      onSelect={setSelectedPlugin}
                      isInstalling={installingPluginId === plugin.id}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div layout className="border rounded-lg">
                  {filteredAndSortedPlugins.map(plugin => (
                    <div key={plugin.id} className="flex items-center gap-4 p-4 border-b last:border-b-0 cursor-pointer hover:bg-accent" onClick={() => setSelectedPlugin(plugin)}>
                      <PluginIcon icon={plugin.icon} name={plugin.name} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{plugin.name}</h3>
                          <Badge variant="outline">v{plugin.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{plugin.description}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span>{formatDownloads(plugin.downloads)}</span>
                        </div>
                        <RatingStars rating={plugin.rating} />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleInstall(plugin.id); }}
                        disabled={installingPluginId === plugin.id}
                      >
                        {installingPluginId === plugin.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install'}
                      </Button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {filteredAndSortedPlugins.length === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                <p>No plugins match your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <PluginDetailDialog
        plugin={selectedPlugin}
        isOpen={!!selectedPlugin}
        onClose={() => setSelectedPlugin(null)}
      />

      <UninstallConfirmationDialog
        plugin={uninstallTarget}
        isOpen={!!uninstallTarget}
        onClose={() => setUninstallTarget(null)}
        onConfirm={handleUninstallConfirm}
      />
    </div>
  );
};