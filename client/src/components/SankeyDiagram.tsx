import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type SankeyNode = { id: string };
type SankeyLink = { source: string; target: string; value: number };
type SankeyData = { nodes: SankeyNode[]; links: SankeyLink[] };

interface ProcessedNode extends SankeyNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  value: number;
  sourceLinks: ProcessedLink[];
  targetLinks: ProcessedLink[];
  depth: number;
}

interface ProcessedLink extends SankeyLink {
  y0: number;
  y1: number;
  width: number;
  sourceNode: ProcessedNode;
  targetNode: ProcessedNode;
}

// --- MOCK DATA ---
const mockData: SankeyData = {
  nodes: [
    { id: "Organic" }, { id: "Social" }, { id: "Direct" }, { id: "Referral" },
    { id: "Homepage" }, { id: "Pricing" }, { id: "Blog" },
    { id: "Subscribed" }, { id: "Bounced" }, { id: "Contacted" },
  ],
  links: [
    { source: "Organic", target: "Homepage", value: 120 },
    { source: "Social", target: "Homepage", value: 80 },
    { source: "Direct", target: "Homepage", value: 150 },
    { source: "Referral", target: "Blog", value: 50 },
    { source: "Homepage", target: "Pricing", value: 180 },
    { source: "Homepage", target: "Blog", value: 70 },
    { source: "Homepage", target: "Bounced", value: 100 },
    { source: "Blog", target: "Pricing", value: 40 },
    { source: "Blog", target: "Contacted", value: 30 },
    { source: "Pricing", target: "Subscribed", value: 150 },
    { source: "Pricing", target: "Contacted", value: 50 },
    { source: "Pricing", target: "Bounced", value: 20 },
  ],
};

// --- LAYOUT CALCULATION (NO D3) ---
const calculateSankeyLayout = (
  data: SankeyData,
  width: number,
  height: number,
  nodeWidth: number,
  nodePadding: number
): { nodes: ProcessedNode[]; links: ProcessedLink[] } => {
  const nodesByName: { [key: string]: ProcessedNode } = {};
  data.nodes.forEach(node => {
    nodesByName[node.id] = { ...node, sourceLinks: [], targetLinks: [], value: 0, depth: 0, x0: 0, x1: 0, y0: 0, y1: 0 };
  });

  const links: ProcessedLink[] = data.links.map(link => ({
    ...link, y0: 0, y1: 0, width: 0,
    sourceNode: nodesByName[link.source],
    targetNode: nodesByName[link.target],
  }));

  links.forEach(link => {
    nodesByName[link.source].sourceLinks.push(link);
    nodesByName[link.target].targetLinks.push(link);
  });

  const nodes = Object.values(nodesByName);

  // Assign depths
  const assignDepths = () => {
    let currentNodes = nodes.filter(n => n.targetLinks.length === 0);
    let depth = 0;
    while (currentNodes.length > 0) {
      currentNodes.forEach(n => n.depth = depth);
      const nextNodes = new Set<ProcessedNode>();
      currentNodes.forEach(n => n.sourceLinks.forEach(l => nextNodes.add(l.targetNode)));
      currentNodes = Array.from(nextNodes);
      depth++;
    }
  };
  assignDepths();

  const columns = Array.from(new Set(nodes.map(n => n.depth))).map(depth => nodes.filter(n => n.depth === depth));
  const columnWidth = (width - nodeWidth) / (columns.length - 1);

  nodes.forEach(node => {
    node.x0 = node.depth * columnWidth;
    node.x1 = node.x0 + nodeWidth;
    node.value = Math.max(
      node.sourceLinks.reduce((a, l) => a + l.value, 0),
      node.targetLinks.reduce((a, l) => a + l.value, 0)
    );
  });

  const distributeVertically = () => {
    columns.forEach(column => {
      const totalValue = column.reduce((a, n) => a + n.value, 0);
      const availableHeight = height - (column.length - 1) * nodePadding;
      const scale = availableHeight / totalValue;
      let y = 0;
      column.forEach(node => {
        node.y0 = y;
        node.y1 = y + node.value * scale;
        y = node.y1 + nodePadding;
      });
    });
  };
  distributeVertically();

  links.forEach(link => {
    link.width = link.value / nodesByName[link.source].value * (nodesByName[link.source].y1 - nodesByName[link.source].y0);
  });

  nodes.forEach(node => {
    let ySource = node.y0;
    node.sourceLinks.sort((a, b) => a.targetNode.y0 - b.targetNode.y0).forEach(link => {
      link.y0 = ySource + link.width / 2;
      ySource += link.width;
    });
    let yTarget = node.y0;
    node.targetLinks.sort((a, b) => a.sourceNode.y0 - b.sourceNode.y0).forEach(link => {
      link.y1 = yTarget + link.width / 2;
      yTarget += link.width;
    });
  });

  return { nodes, links };
};

// --- SVG PATH GENERATOR ---
const sankeyLinkPath = (link: ProcessedLink): string => {
  const x0 = link.sourceNode.x1;
  const x1 = link.targetNode.x0;
  const y0 = link.y0;
  const y1 = link.y1;
  const x_ = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${x_} ${y0}, ${x_} ${y1}, ${x1} ${y1}`;
};

// --- COLOR PALETTE ---
const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

// --- COMPONENT ---
const SankeyDiagram: React.FC = () => {
  const [hoveredLink, setHoveredLink] = useState<ProcessedLink | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ProcessedNode | null>(null);

  const width = 800, height = 500, nodeWidth = 15, nodePadding = 10;

  const { nodes, links } = useMemo(() =>
    calculateSankeyLayout(mockData, width, height, nodeWidth, nodePadding),
    [width, height, nodeWidth, nodePadding]
  );

  const color = useMemo(() => {
    const colorScale: { [key: string]: string } = {};
    nodes.filter(n => n.targetLinks.length === 0).forEach((node, i) => {
      colorScale[node.id] = COLORS[i % COLORS.length];
    });
    return (nodeId: string) => colorScale[nodeId] || "hsl(var(--muted-foreground))";
  }, [nodes]);

  const getLinkColor = (link: ProcessedLink) => {
    let current = link.sourceNode;
    while (current.targetLinks.length > 0) {
      current = current.targetLinks[0].sourceNode;
    }
    return color(current.id);
  };

  const isHighlighted = (item: ProcessedNode | ProcessedLink) => {
    if (!hoveredNode && !hoveredLink) return true;
    if ('source' in item) { // is link
      const link = item as ProcessedLink;
      return hoveredLink === link || hoveredNode === link.sourceNode || hoveredNode === link.targetNode;
    }
    const node = item as ProcessedNode;
    if (hoveredNode === node) return true;
    if (hoveredLink) {
      return hoveredLink.sourceNode === node || hoveredLink.targetNode === node;
    }
    return false;
  };

  return (
    <div className="w-full h-full bg-background text-foreground p-4 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Website Traffic Flow</h2>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <g>
          {links.map((link, i) => (
            <motion.path
              key={`link-${i}`}
              d={sankeyLinkPath(link)}
              stroke={getLinkColor(link)}
              strokeWidth={Math.max(1, link.width)}
              strokeOpacity={isHighlighted(link) ? 0.7 : 0.1}
              fill="none"
              onMouseEnter={() => setHoveredLink(link)}
              onMouseLeave={() => setHoveredLink(null)}
              transition={{ duration: 0.2 }}
            />
          ))}
        </g>
        <g>
          {nodes.map((node, i) => (
            <g key={`node-${i}`} transform={`translate(${node.x0}, ${node.y0})`}>
              <motion.rect
                width={node.x1 - node.x0}
                height={Math.max(1, node.y1 - node.y0)}
                fill={color(node.id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                opacity={isHighlighted(node) ? 1 : 0.3}
                className="cursor-pointer"
                rx={2}
                transition={{ duration: 0.2 }}
              />
              <text
                x={node.x0 < width / 2 ? (node.x1 - node.x0) + 6 : -6}
                y={(node.y1 - node.y0) / 2}
                dy="0.35em"
                textAnchor={node.x0 < width / 2 ? "start" : "end"}
                className="fill-foreground text-sm font-medium pointer-events-none"
                opacity={isHighlighted(node) ? 1 : 0.5}
              >
                {node.id} ({node.value.toLocaleString()})
              </text>
            </g>
          ))}
        </g>
        {hoveredLink && (
          <g transform={`translate(${(hoveredLink.sourceNode.x1 + hoveredLink.targetNode.x0) / 2}, ${(hoveredLink.y0 + hoveredLink.y1) / 2})`} className="pointer-events-none">
            <rect x="-70" y="-20" width="140" height="40" fill="hsl(var(--popover))" stroke="hsl(var(--border))" rx="4" />
            <text textAnchor="middle" fill="hsl(var(--popover-foreground))" className="text-xs">
              <tspan x="0" dy="-0.4em">{`${hoveredLink.source} → ${hoveredLink.target}`}</tspan>
              <tspan x="0" dy="1.2em">{hoveredLink.value.toLocaleString()}</tspan>
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default SankeyDiagram;
