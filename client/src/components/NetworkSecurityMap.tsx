import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Server, Smartphone, Laptop, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- TYPE DEFINITIONS ---
type ZoneId = 'dmz' | 'internal' | 'restricted' | 'external';

interface Zone {
  id: ZoneId;
  name: string;
  color: string;
  gridPosition: { row: number; col: number; span: number };
}

interface Asset {
  id: string;
  name: string;
  type: 'server' | 'laptop' | 'smartphone';
  ip: string;
}

interface Firewall {
  id: string;
  from: ZoneId;
  to: ZoneId;
  position: { top: string; left: string };
}

interface TrafficFlow {
  id: string;
  from: ZoneId;
  to: ZoneId;
  port: number;
  protocol: 'TCP' | 'UDP';
  status: 'allowed' | 'denied';
  hasAnomaly: boolean;
}

interface SecurityRule {
  id: string;
  source: string;
  destination: string;
  port: number | 'any';
  action: 'allow' | 'deny';
  description: string;
}

// --- MOCK DATA ---
const zones: Zone[] = [
  { id: 'external', name: 'External', color: 'border-red-500/50', gridPosition: { row: 1, col: 1, span: 2 } },
  { id: 'dmz', name: 'DMZ', color: 'border-yellow-500/50', gridPosition: { row: 2, col: 1, span: 2 } },
  { id: 'internal', name: 'Internal', color: 'border-green-500/50', gridPosition: { row: 3, col: 1, span: 1 } },
  { id: 'restricted', name: 'Restricted', color: 'border-blue-500/50', gridPosition: { row: 3, col: 2, span: 1 } },
];

const assets: Record<ZoneId, Asset[]> = {
  external: [],
  dmz: [
    { id: 'asset-1', name: 'Web Server 01', type: 'server', ip: '10.0.0.5' },
    { id: 'asset-2', name: 'Web Server 02', type: 'server', ip: '10.0.0.6' },
  ],
  internal: [
    { id: 'asset-3', name: 'Employee Laptop', type: 'laptop', ip: '192.168.1.100' },
    { id: 'asset-4', name: 'Internal App Server', type: 'server', ip: '192.168.1.50' },
  ],
  restricted: [
    { id: 'asset-6', name: 'Database Server', type: 'server', ip: '172.16.0.10' },
  ],
};

const firewalls: Firewall[] = [
    { id: 'fw-ext-dmz', from: 'external', to: 'dmz', position: { top: '29%', left: '50%' } },
    { id: 'fw-dmz-int', from: 'dmz', to: 'internal', position: { top: '62%', left: '25%' } },
    { id: 'fw-dmz-res', from: 'dmz', to: 'restricted', position: { top: '62%', left: '75%' } },
    { id: 'fw-int-res', from: 'internal', to: 'restricted', position: { top: '83%', left: '50%' } },
];

const trafficFlows: TrafficFlow[] = [
  { id: 'flow-1', from: 'external', to: 'dmz', port: 443, protocol: 'TCP', status: 'allowed', hasAnomaly: false },
  { id: 'flow-2', from: 'external', to: 'dmz', port: 80, protocol: 'TCP', status: 'allowed', hasAnomaly: false },
  { id: 'flow-3', from: 'external', to: 'internal', port: 22, protocol: 'TCP', status: 'denied', hasAnomaly: false },
  { id: 'flow-4', from: 'dmz', to: 'restricted', port: 5432, protocol: 'TCP', status: 'allowed', hasAnomaly: true },
  { id: 'flow-5', from: 'internal', to: 'dmz', port: 8080, protocol: 'TCP', status: 'denied', hasAnomaly: false },
  { id: 'flow-6', from: 'internal', to: 'restricted', port: 3306, protocol: 'TCP', status: 'allowed', hasAnomaly: false },
];

const securityRules: SecurityRule[] = [
  { id: 'rule-1', source: 'any', destination: 'DMZ', port: 443, action: 'allow', description: 'Allow HTTPS to DMZ' },
  { id: 'rule-2', source: 'any', destination: 'DMZ', port: 80, action: 'allow', description: 'Allow HTTP to DMZ' },
  { id: 'rule-3', source: 'DMZ', destination: 'Restricted', port: 5432, action: 'allow', description: 'Allow DB access from DMZ' },
  { id: 'rule-4', source: 'Internal', destination: 'Restricted', port: 3306, action: 'allow', description: 'Allow DB access from Internal' },
  { id: 'rule-5', source: 'any', destination: 'any', port: 'any', action: 'deny', description: 'Default Deny All' },
];

const AssetIcon: React.FC<{ type: Asset['type'] }> = ({ type }) => {
  const icons = { server: Server, laptop: Laptop, smartphone: Smartphone };
  const Icon = icons[type];
  return <Icon className="h-5 w-5" />;
};

const FirewallIcon: React.FC<{ firewall: Firewall }> = ({ firewall }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      key={firewall.id}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      style={{ top: firewall.position.top, left: firewall.position.left }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.2, zIndex: 10 }}
    >
      <Shield className="h-8 w-8 text-blue-400 fill-background" />
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-card text-foreground text-xs rounded shadow-lg whitespace-nowrap"
          >
            Firewall
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function NetworkSecurityMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const zonePositions = useMemo(() => {
    if (dimensions.width === 0) return null;
    const pos: Record<ZoneId, { x: number; y: number; width: number; height: number }> = {} as any;
    const colWidth = dimensions.width / 2;
    const rowHeight = dimensions.height / 3;

    zones.forEach(zone => {
      pos[zone.id] = {
        x: (zone.gridPosition.col - 1) * colWidth + 10,
        y: (zone.gridPosition.row - 1) * rowHeight + 10,
        width: zone.gridPosition.span * colWidth - 20,
        height: rowHeight - 20,
      };
    });
    return pos;
  }, [dimensions]);

  const handleZoneClick = (zoneId: ZoneId) => {
    setSelectedZone(prev => (prev === zoneId ? null : zoneId));
  };

  const selectedAssets = useMemo(() => selectedZone ? assets[selectedZone] : [], [selectedZone]);

  const selectedRules = useMemo(() => {
    if (!selectedZone) return securityRules;
    const zoneName = zones.find(z => z.id === selectedZone)?.name || '';
    return securityRules.filter(r => r.destination === zoneName || r.source === zoneName);
  }, [selectedZone]);

  return (
    <Card className="w-full h-[700px] bg-background text-foreground flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center"><Network className="mr-2" /> Network Security Map</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative h-full bg-muted/20 rounded-lg p-4 border border-border">
          <div className="relative w-full h-full" ref={containerRef}>
            {zonePositions && (
              <svg width="100%" height="100%" className="overflow-visible">
                <defs>
                  <marker id="arrow-allowed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
                  </marker>
                  <marker id="arrow-denied" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" className="fill-destructive" />
                  </marker>
                </defs>

                {zones.map(zone => (
                  <motion.g key={zone.id} onClick={() => handleZoneClick(zone.id)} className="cursor-pointer">
                    <motion.rect
                      x={zonePositions[zone.id].x}
                      y={zonePositions[zone.id].y}
                      width={zonePositions[zone.id].width}
                      height={zonePositions[zone.id].height}
                      rx={8} ry={8}
                      className={cn("fill-card stroke-2 transition-all", zone.color)}
                      animate={{ 
                        scale: selectedZone === zone.id ? 1.02 : 1,
                        filter: selectedZone === zone.id ? 'brightness(1.2)' : 'brightness(1)',
                        strokeWidth: selectedZone === zone.id ? 3 : 2,
                      }}
                      whileHover={{ filter: 'brightness(1.1)' }}
                    />
                    <text x={zonePositions[zone.id].x + 15} y={zonePositions[zone.id].y + 30} className="fill-foreground font-bold text-lg select-none">{zone.name}</text>
                  </motion.g>
                ))}

                {trafficFlows.map((flow, index) => {
                  const fromZone = zonePositions[flow.from];
                  const toZone = zonePositions[flow.to];
                  if (!fromZone || !toZone) return null;

                  const fromCenter = { x: fromZone.x + fromZone.width / 2, y: fromZone.y + fromZone.height / 2 };
                  const toCenter = { x: toZone.x + toZone.width / 2, y: toZone.y + toZone.height / 2 };
                  
                  const dx = toCenter.x - fromCenter.x;
                  const dy = toCenter.y - fromCenter.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  const nx = -dy / dist;
                  const ny = dx / dist;
                  const offset = (index % 3 - 1) * (dist / 15);

                  const mid = { x: (fromCenter.x + toCenter.x) / 2 + offset * nx, y: (fromCenter.y + toCenter.y) / 2 + offset * ny };
                  const path = `M ${fromCenter.x} ${fromCenter.y} Q ${mid.x} ${mid.y} ${toCenter.x} ${toCenter.y}`;
                  const textPos = { x: mid.x, y: mid.y - 10 };

                  return (
                    <g key={flow.id}>
                      <motion.path
                        d={path}
                        className={cn("fill-none stroke-2", { 'stroke-primary': flow.status === 'allowed', 'stroke-destructive': flow.status === 'denied' })}
                        markerEnd={flow.status === 'allowed' ? 'url(#arrow-allowed)' : 'url(#arrow-denied)'}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                      />
                      {flow.hasAnomaly && (
                        <motion.circle cx={mid.x} cy={mid.y} r="8" className="fill-yellow-500 stroke-background stroke-2">
                          <title>Anomaly Detected</title>
                          <animate attributeName="r" values="6;9;6" dur="1s" repeatCount="indefinite" />
                        </motion.circle>
                      )}
                      <text x={textPos.x} y={textPos.y} textAnchor="middle" className="fill-foreground text-xs font-mono select-none">{flow.port}/{flow.protocol}</text>
                    </g>
                  );
                })}
              </svg>
            )}
            {firewalls.map(fw => <FirewallIcon key={fw.id} firewall={fw} />)}
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selectedZone ? `${zones.find(z => z.id === selectedZone)?.name} Assets` : 'Asset Overview'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <AnimatePresence mode="wait">
                  <motion.div key={selectedZone || 'empty'}>
                    {selectedAssets.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedAssets.map((asset, i) => (
                          <motion.li 
                            key={asset.id} 
                            className="flex items-center" 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <AssetIcon type={asset.type} />
                            <span className="ml-2 text-sm">{asset.name} ({asset.ip})</span>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <motion.p 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-sm text-muted-foreground pt-4 text-center"
                      >
                        {selectedZone ? 'No assets in this zone.' : 'Click a zone to see assets.'}
                      </motion.p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                <ul className="space-y-3">
                  {selectedRules.map((rule, i) => (
                    <motion.li 
                      key={rule.id} 
                      className="text-xs p-2 rounded-md bg-muted/50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-semibold">{rule.source} &rarr; {rule.destination}:{rule.port}</span>
                        <Badge variant={rule.action === 'allow' ? 'secondary' : 'destructive'}>{rule.action.toUpperCase()}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{rule.description}</p>
                    </motion.li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
