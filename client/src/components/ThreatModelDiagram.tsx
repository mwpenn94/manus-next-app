import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Wrench, CircleX, ZoomIn, ZoomOut, Info } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- TYPE DEFINITIONS ---
type StrideCategory = "Spoofing" | "Tampering" | "Repudiation" | "InformationDisclosure" | "DenialOfService" | "ElevationOfPrivilege";

interface SystemComponent {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DataFlow {
  id: string;
  from: string;
  to: string;
  label: string;
  threats: Threat[];
}

interface Threat {
  id: string;
  stride: StrideCategory;
  description: string;
  mitigation: string;
}

interface Asset {
  id: string;
  name: string;
  componentId: string;
  criticality: "Low" | "Medium" | "High";
}

interface TrustBoundary {
  id: string;
  label: string;
  points: Array<{x: number, y: number}>;
}

// --- MOCK DATA ---
const mockComponents: SystemComponent[] = [
  { id: 'c1', name: 'Web Browser', x: 50, y: 200, width: 150, height: 80 },
  { id: 'c2', name: 'Web Server', x: 300, y: 150, width: 180, height: 120 },
  { id: 'c3', name: 'API Gateway', x: 300, y: 350, width: 180, height: 80 },
  { id: 'c4', name: 'User Database', x: 600, y: 100, width: 150, height: 100 },
  { id: 'c5', name: 'Auth Service', x: 600, y: 350, width: 150, height: 80 },
];

const mockThreats: Threat[] = [
    { id: 't1', stride: 'Spoofing', description: 'User session cookie could be stolen.', mitigation: 'Implement HttpOnly, Secure flags on cookies.' },
    { id: 't2', stride: 'Tampering', description: 'SQL Injection on user profile update.', mitigation: 'Use parameterized queries.' },
    { id: 't3', stride: 'InformationDisclosure', description: 'Error messages reveal internal paths.', mitigation: 'Implement generic error pages.' },
    { id: 't4', stride: 'DenialOfService', description: 'Rate limiting not enforced on login.', mitigation: 'Add rate limiting to authentication endpoints.' },
    { id: 't5', stride: 'ElevationOfPrivilege', description: 'Admin endpoint accessible to non-admin users.', mitigation: 'Enforce role-based access control (RBAC).' },
    { id: 't6', stride: 'Repudiation', description: 'No audit trail for sensitive data access.', mitigation: 'Log all access to sensitive user data.' },
];

const mockDataFlows: DataFlow[] = [
  { id: 'df1', from: 'c1', to: 'c2', label: 'HTTP Request', threats: [mockThreats[0]] },
  { id: 'df2', from: 'c2', to: 'c1', label: 'HTML Response', threats: [] },
  { id: 'df3', from: 'c2', to: 'c4', label: 'DB Query', threats: [mockThreats[1]] },
  { id: 'df4', from: 'c4', to: 'c2', label: 'User Data', threats: [mockThreats[2]] },
  { id: 'df5', from: 'c2', to: 'c3', label: 'API Call', threats: [] },
  { id: 'df6', from: 'c3', to: 'c5', label: 'Auth Request', threats: [mockThreats[3], mockThreats[4]] },
  { id: 'df7', from: 'c5', to: 'c3', label: 'JWT Token', threats: [] },
  { id: 'df8', from: 'c4', to: 'c3', label: 'Audit Log', threats: [mockThreats[5]] },
];

const mockAssets: Asset[] = [
    { id: 'a1', name: 'User PII', componentId: 'c4', criticality: 'High' },
    { id: 'a2', name: 'Session Token', componentId: 'c1', criticality: 'Medium' },
];

const mockTrustBoundaries: TrustBoundary[] = [
    { id: 'tb1', label: 'Server Boundary', points: [{x: 250, y: 50}, {x: 250, y: 500}, {x: 800, y: 500}, {x: 800, y: 50}] },
];

const STRIDE_CONFIG: Record<StrideCategory, { color: string; icon: React.ElementType }> = {
    Spoofing: { color: 'bg-red-500', icon: ShieldAlert },
    Tampering: { color: 'bg-orange-500', icon: Wrench },
    Repudiation: { color: 'bg-yellow-500', icon: CircleX },
    InformationDisclosure: { color: 'bg-blue-500', icon: Info },
    DenialOfService: { color: 'bg-purple-500', icon: ShieldAlert },
    ElevationOfPrivilege: { color: 'bg-green-500', icon: ShieldAlert },
};

export default function ThreatModelDiagram() {
  const [zoom, setZoom] = useState(1);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);

  const dataFlowArrows = useMemo(() => {
    return mockDataFlows.map(flow => {
      const fromComp = mockComponents.find(c => c.id === flow.from);
      const toComp = mockComponents.find(c => c.id === flow.to);
      if (!fromComp || !toComp) return null;

      const start = { x: fromComp.x + fromComp.width, y: fromComp.y + fromComp.height / 2 };
      const end = { x: toComp.x, y: toComp.y + toComp.height / 2 };
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

      const path = `M ${start.x} ${start.y} C ${start.x + 50} ${start.y}, ${end.x - 50} ${end.y}, ${end.x} ${end.y}`;

      return {
        id: flow.id,
        path,
        label: flow.label,
        labelPos: mid,
        threats: flow.threats,
      };
    }).filter((Boolean) => Boolean);
  }, []);

  const threatIndicators = useMemo(() => {
    return dataFlowArrows.flatMap(arrow => {
        if(!arrow) return [];
        return arrow.threats.map((threat, index) => {
            const point = { x: arrow.labelPos.x + (index * 20) - (arrow.threats.length -1) * 10, y: arrow.labelPos.y + 20 };
            return {
                id: `${arrow.id}-${threat.id}`,
                x: point.x,
                y: point.y,
                threat,
                color: STRIDE_CONFIG[threat.stride].color,
            };
        });
    });
  }, [dataFlowArrows]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.5));

  return (
    <Card className="w-full h-[700px] flex flex-col bg-background text-foreground border-border">
      <CardHeader>
        <CardTitle>Threat Model Diagram</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex relative overflow-hidden">
        <div className="flex-grow relative bg-muted/20 rounded-md border">
            
<motion.div className="absolute top-0 left-0 w-full h-full" style={{ scale: zoom }}>
  <svg width="100%" height="100%" viewBox="0 0 900 600">
    {/* Trust Boundaries */}
    {mockTrustBoundaries.map(boundary => (
      <motion.path
        key={boundary.id}
        d={`M ${boundary.points.map(p => `${p.x} ${p.y}`).join(" L ")}`}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="2"
        strokeDasharray="5,5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
    ))}

    {/* System Components */}
    {mockComponents.map(comp => (
      <motion.g key={comp.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <rect
          x={comp.x}
          y={comp.y}
          width={comp.width}
          height={comp.height}
          rx="8"
          ry="8"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        <text x={comp.x + comp.width / 2} y={comp.y + comp.height / 2} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--foreground))" className="font-semibold">
          {comp.name}
        </text>
      </motion.g>
    ))}

    {/* Data Flows */}
    {dataFlowArrows.map(arrow => {
        if(!arrow) return null;
        return (
      <motion.g key={arrow.id}>
        <motion.path
          d={arrow.path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          markerEnd={`url(#arrowhead)`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeInOut" }}
        />
        <text x={arrow.labelPos.x} y={arrow.labelPos.y} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
          {arrow.label}
        </text>
      </motion.g>
    )})}

    {/* Threat Indicators */}
    {threatIndicators.map(indicator => (
      <TooltipProvider key={indicator.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.g transform={`translate(${indicator.x}, ${indicator.y})`}>
              <motion.circle
                r="8"
                fill={indicator.color}
                stroke="hsl(var(--background))"
                strokeWidth="2"
                whileHover={{ scale: 1.2 }}
                onClick={() => setSelectedThreat(indicator.threat)}
              />
            </motion.g>
          </TooltipTrigger>
          <TooltipContent>
            <p>{indicator.threat.stride}: {indicator.threat.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ))}

    {/* Assets */}
    {mockAssets.map(asset => {
      const component = mockComponents.find(c => c.id === asset.componentId);
      if (!component) return null;
      return (
        <motion.g key={asset.id} transform={`translate(${component.x + 20}, ${component.y + component.height - 20})`}>
          <rect x="-10" y="-10" width="80" height="20" rx="4" fill={`hsl(var(--${asset.criticality === 'High' ? 'destructive' : asset.criticality === 'Medium' ? 'primary' : 'secondary'}))`}/>
          <text x="30" y="0" textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--destructive-foreground))" fontSize="10" className="font-bold">
            {asset.name}
          </text>
        </motion.g>
      );
    })}

    <defs>
      <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
      </marker>
    </defs>
  </svg>
</motion.div>

        </div>
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Card className="w-48">
            <CardHeader className="p-2">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {Object.entries(STRIDE_CONFIG).map(([key, { color, icon: Icon }]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded-full", color)} />
                    <span className="text-xs">{key}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomIn}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}><ZoomOut className="w-4 h-4" /></Button>
          </div>
        </div>

        <AnimatePresence>
          {selectedThreat && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ ease: "easeInOut" }}
              className="absolute top-0 right-0 w-80 h-full bg-background border-l p-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Threat Details</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedThreat(null)}><CircleX className="w-5 h-5" /></Button>
              </div>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Category</h4>
                  <Badge variant="secondary" className={cn("mt-1", STRIDE_CONFIG[selectedThreat.stride].color)}>{selectedThreat.stride}</Badge>
                </div>
                <div>
                  <h4 className="font-semibold">Description</h4>
                  <p className="text-muted-foreground">{selectedThreat.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Mitigation</h4>
                  <p className="text-muted-foreground">{selectedThreat.mitigation}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </CardContent>
    </Card>
  );
}
