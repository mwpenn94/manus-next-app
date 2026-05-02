
import React, { useState, useMemo, useEffect } from 'react';
import { Server, Database, Zap, ArrowRight, X, ChevronsRight } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type ServiceType = 'api' | 'service' | 'database' | 'cache';

interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  x: number;
  y: number;
}

interface ServiceLink {
  source: string;
  target: string;
  latency: number; // in ms
  errorRate: number; // 0.0 to 1.0
  requestsPerSecond: number;
}

interface MockData {
  nodes: ServiceNode[];
  links: ServiceLink[];
}

// --- MOCK DATA GENERATION ---
const generateMockData = (): MockData => {
  const nodes: ServiceNode[] = [
    { id: 'api-gateway', name: 'API Gateway', type: 'api', x: 100, y: 300 },
    { id: 'user-service', name: 'User Service', type: 'service', x: 300, y: 150 },
    { id: 'product-service', name: 'Product Service', type: 'service', x: 300, y: 450 },
    { id: 'auth-service', name: 'Auth Service', type: 'service', x: 500, y: 50 },
    { id: 'user-db', name: 'User DB', type: 'database', x: 500, y: 200 },
    { id: 'product-db', name: 'Product DB', type: 'database', x: 500, y: 400 },
    { id: 'session-cache', name: 'Session Cache', type: 'cache', x: 700, y: 50 },
    { id: 'search-service', name: 'Search Service', type: 'service', x: 500, y: 550 },
  ];

  const links: ServiceLink[] = [
    { source: 'api-gateway', target: 'user-service', latency: 50, errorRate: 0.01, requestsPerSecond: 120 },
    { source: 'api-gateway', target: 'product-service', latency: 70, errorRate: 0.02, requestsPerSecond: 200 },
    { source: 'user-service', target: 'auth-service', latency: 40, errorRate: 0.005, requestsPerSecond: 80 },
    { source: 'user-service', target: 'user-db', latency: 20, errorRate: 0.001, requestsPerSecond: 60 },
    { source: 'product-service', target: 'product-db', latency: 25, errorRate: 0.002, requestsPerSecond: 150 },
    { source: 'product-service', target: 'search-service', latency: 100, errorRate: 0.05, requestsPerSecond: 50 },
    { source: 'auth-service', target: 'session-cache', latency: 10, errorRate: 0.0, requestsPerSecond: 75 },
    { source: 'search-service', target: 'product-db', latency: 40, errorRate: 0.03, requestsPerSecond: 45 },
  ];

  return { nodes, links };
};

// --- HELPER COMPONENTS & FUNCTIONS ---
const getIcon = (type: ServiceType, size: string) => {
  const className = `${size} text-white/80`;
  switch (type) {
    case 'api': return <Server className={className} />;
    case 'service': return <Zap className={className} />;
    case 'database': return <Database className={className} />;
    case 'cache': return <ChevronsRight className={className} />;
  }
};

const getStatusColor = (errorRate: number) => {
  if (errorRate > 0.05) return 'bg-red-500';
  if (errorRate > 0.01) return 'bg-orange-500';
  return 'bg-green-500';
};

const ServiceMeshNode: React.FC<{ node: ServiceNode; onClick: (node: ServiceNode) => void; isSelected: boolean; isDimmed: boolean }> = ({ node, onClick, isSelected, isDimmed }) => (
  <g transform={`translate(${node.x}, ${node.y})`} onClick={() => onClick(node)} className="cursor-pointer group" style={{ transition: 'opacity 300ms' }} opacity={isDimmed ? 0.3 : 1}>
    <rect x="-50" y="-22" width="100" height="44" rx="8" ry="8" 
          className={`fill-[#0a0a0a] stroke-2 transition-all duration-300 ${isSelected ? 'stroke-blue-500' : 'stroke-white/20 group-hover:stroke-white/40'}`} />
    <foreignObject x="-40" y="-12" width="24" height="24">{getIcon(node.type, 'w-6 h-6')}</foreignObject>
    <text x="0" y="5" textAnchor="middle" className="fill-white/90 text-sm font-medium transition-colors duration-300 group-hover:fill-white">{node.name}</text>
  </g>
);

const ServiceMeshLink: React.FC<{ link: ServiceLink; nodes: ServiceNode[]; onClick: (link: ServiceLink) => void; isSelected: boolean; isDimmed: boolean }> = ({ link, nodes, onClick, isSelected, isDimmed }) => {
  const sourceNode = nodes.find(n => n.id === link.source);
  const targetNode = nodes.find(n => n.id === link.target);

  if (!sourceNode || !targetNode) return null;

  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;
  const angle = Math.atan2(dy, dx);
  const startX = sourceNode.x + 50 * Math.cos(angle);
  const startY = sourceNode.y + 22 * Math.sin(angle) * (Math.abs(Math.sin(angle)) > 0.5 ? 1.5 : 1);
  const endX = targetNode.x - 50 * Math.cos(angle);
  const endY = targetNode.y - 22 * Math.sin(angle) * (Math.abs(Math.sin(angle)) > 0.5 ? 1.5 : 1);

  const pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
  const statusColor = getStatusColor(link.errorRate).replace('bg-', 'stroke-');

  return (
    <g onClick={() => onClick(link)} className="cursor-pointer group" style={{ transition: 'opacity 300ms' }} opacity={isDimmed ? 0.2 : 1}>
      <path d={pathData} className={`fill-none transition-all duration-300 ${isSelected ? 'stroke-blue-500 stroke-2' : 'stroke-white/20 group-hover:stroke-white/50'}`} markerEnd="url(#arrowhead)" />
      <path d={pathData} className={`fill-none stroke-[6px] opacity-0 group-hover:opacity-100 ${isSelected ? 'stroke-blue-500/20' : 'stroke-white/10'}`} />
      <circle cx={(startX + endX) / 2} cy={(startY + endY) / 2} r="3" className={`${statusColor.replace('stroke', 'bg')} transition-colors duration-300`} />
    </g>
  );
};

const DetailPanel: React.FC<{ item: ServiceNode | ServiceLink | null; onClose: () => void; nodes: ServiceNode[] }> = ({ item, onClose, nodes }) => {
  const isLink = (it: any): it is ServiceLink => it && it.source;
  const selectedItem = item;

  return (
    <div className={`w-full md:w-80 bg-[#0a0a0a] border-t md:border-t-0 md:border-l border-white/10 p-4 flex flex-col transition-all duration-300 ${selectedItem ? 'translate-x-0' : 'hidden'}`}>
      {selectedItem && (
        <div className="flex flex-col h-full animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Details</h2>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X size={20} /></button>
          </div>
          <div className="bg-white/5 p-4 rounded-lg text-sm font-mono flex-grow">
            {isLink(selectedItem) ? (
              <div className="space-y-3">
                <p className="text-white font-bold text-base break-all">{selectedItem.source} → {selectedItem.target}</p>
                <p>Latency: <span className="text-white/80 font-semibold">{selectedItem.latency}ms</span></p>
                <p>Error Rate: <span className="text-white/80 font-semibold">{(selectedItem.errorRate * 100).toFixed(2)}%</span></p>
                <p>RPS: <span className="text-white/80 font-semibold">{selectedItem.requestsPerSecond}</span></p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-white font-bold text-base">{selectedItem.name}</p>
                <div className="flex items-center space-x-2">
                  {getIcon(selectedItem.type, 'w-5 h-5')}
                  <p>Type: <span className="text-white/80 font-semibold capitalize">{selectedItem.type}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT: ServiceMesh ---
export default function ServiceMesh() {
  const [data] = useState<MockData>(generateMockData());
  const [selectedItem, setSelectedItem] = useState<ServiceNode | ServiceLink | null>(null);

  const handleSelect = (item: ServiceNode | ServiceLink) => {
    setSelectedItem(item);
  };

  const isNode = (item: any): item is ServiceNode => item && item.x && item.y;

  const dimmedItems = useMemo(() => {
    if (!selectedItem || !isNode(selectedItem)) return { nodes: [], links: [] };
    const connectedLinks = data.links.filter(l => l.source === selectedItem.id || l.target === selectedItem.id);
    const connectedNodeIds = new Set(connectedLinks.flatMap(l => [l.source, l.target]));
    return {
      nodes: data.nodes.filter(n => !connectedNodeIds.has(n.id)).map(n => n.id),
      links: data.links.filter(l => !connectedLinks.includes(l))
    };
  }, [selectedItem, data]);

  return (
    <div className="w-full h-[600px] bg-[#0a0a0a] text-white/90 flex flex-col md:flex-row font-sans rounded-lg border border-white/10 overflow-hidden">
      <div className="flex-1 relative bg-grid">
        <svg width="100%" height="100%" viewBox="0 0 800 600">
          <defs>
            <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-white/30" />
            </marker>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <g>
            {data.links.map((link) => (
              <ServiceMeshLink 
                key={`${link.source}-${link.target}`}
                link={link} 
                nodes={data.nodes}
                onClick={handleSelect}
                isSelected={selectedItem === link}
                isDimmed={isNode(selectedItem) && dimmedItems.links.includes(link)}
              />
            ))}
          </g>
          <g>
            {data.nodes.map((node) => (
              <ServiceMeshNode 
                key={node.id} 
                node={node} 
                onClick={handleSelect}
                isSelected={selectedItem === node}
                isDimmed={isNode(selectedItem) && dimmedItems.nodes.includes(node.id)}
              />
            ))}
          </g>
        </svg>
      </div>
      <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} nodes={data.nodes} />
      <style>{`
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .bg-grid { background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 20px; }
      `}</style>
    </div>
  );
}
