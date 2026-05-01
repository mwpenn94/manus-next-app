"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type TreemapNode = {
  name: string;
  value?: number;
  children?: TreemapNode[];
};

type TreemapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  node: TreemapNode;
  path: string[];
};

// --- MOCK DATA ---
const diskUsageData: TreemapNode = {
  name: "root",
  children: [
    {
      name: "Documents",
      children: [
        { name: "report.docx", value: 250 },
        { name: "presentation.pptx", value: 500 },
        {
          name: "research",
          children: [
            { name: "paper-1.pdf", value: 150 },
            { name: "data.csv", value: 300 },
          ],
        },
      ],
    },
    {
      name: "Applications",
      children: [
        { name: "Chrome.app", value: 800 },
        { name: "VSCode.app", value: 600 },
        { name: "Figma.app", value: 450 },
      ],
    },
    {
      name: "Downloads",
      children: [
        { name: "installer.dmg", value: 700 },
        { name: "archive.zip", value: 200 },
      ],
    },
    { name: "system.log", value: 100 },
  ],
};


// --- UTILITY FUNCTIONS ---
const sumNodeValues = (node: TreemapNode): number => {
  if (node.children) {
    return node.children.reduce((sum, child) => sum + sumNodeValues(child), 0);
  }
  return node.value || 0;
};

const squarify = (
  nodes: TreemapNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  totalValue: number,
  basePath: string[]
): TreemapRect[] => {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  const sortedNodes = [...nodes].sort((a, b) => sumNodeValues(b) - sumNodeValues(a));

  const layout = (nodesToLayout: TreemapNode[], rectX: number, rectY: number, rectWidth: number, rectHeight: number): TreemapRect[] => {
    if (nodesToLayout.length === 0) return [];

    const isHorizontal = rectWidth > rectHeight;
    const length = isHorizontal ? rectHeight : rectWidth;

    let sum = 0;
    let i = 1;
    for (; i <= nodesToLayout.length; i++) {
      const newSum = nodesToLayout.slice(0, i).reduce((acc, n) => acc + sumNodeValues(n), 0);
      if (i > 1) {
        const prevRow = nodesToLayout.slice(0, i - 1);
        const nextRow = nodesToLayout.slice(0, i);
        if (worst(prevRow, length, newSum / totalValue) < worst(nextRow, length, newSum / totalValue)) {
            i--; // The previous row was better, so we stick with that.
            break;
        }
      }
      sum = newSum;
    }
    if (i > nodesToLayout.length) i = nodesToLayout.length; // Ensure i is not out of bounds

    const currentRow = nodesToLayout.slice(0, i);
    const remainingNodes = nodesToLayout.slice(i);
    const rowSum = currentRow.reduce((acc, n) => acc + sumNodeValues(n), 0);
    const rowArea = (rowSum / totalValue) * (rectWidth * rectHeight);
    const rowLength = rowArea / length;

    let currentPos = 0;
    const rowRects = currentRow.map(node => {
      const nodeValue = sumNodeValues(node);
      const nodeLength = (nodeValue / rowSum) * length;
      const rect = {
        x: isHorizontal ? rectX : rectX + currentPos,
        y: isHorizontal ? rectY + currentPos : rectY,
        width: isHorizontal ? rowLength : nodeLength,
        height: isHorizontal ? nodeLength : rowLength,
        node,
        path: [...basePath, node.name],
      };
      currentPos += nodeLength;
      return rect;
    });

    const nextRectX = isHorizontal ? rectX + rowLength : rectX;
    const nextRectY = isHorizontal ? rectY : rectY + rowLength;
    const nextRectWidth = isHorizontal ? rectWidth - rowLength : rectWidth;
    const nextRectHeight = isHorizontal ? rectHeight : rectHeight - rowLength;

    return [...rowRects, ...layout(remainingNodes, nextRectX, nextRectY, nextRectWidth, nextRectHeight)];
  };

  return layout(sortedNodes, x, y, width, height);
};

const worst = (row: TreemapNode[], length: number, totalSum: number) => {
    if (row.length === 0) return Infinity;
    const sum = row.reduce((acc, n) => acc + sumNodeValues(n), 0);
    const area = (sum / totalSum) * length * length;
    const max = row.reduce((acc, n) => Math.max(acc, sumNodeValues(n)), 0);
    const min = row.reduce((acc, n) => Math.min(acc, sumNodeValues(n)), Infinity);
    return Math.max(
        (length * length * max) / (area * area),
        (area * area) / (length * length * min)
    );
};

const colorScale = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32bit integer
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

// --- MAIN COMPONENT ---
const TreemapVisualization = () => {
  const [currentPath, setCurrentPath] = useState<string[]>(["root"]);
  const [hoveredRect, setHoveredRect] = useState<TreemapRect | null>(null);

  const currentData = useMemo(() => {
    let node = diskUsageData;
    for (let i = 1; i < currentPath.length; i++) {
      const nextNode = node.children?.find((child) => child.name === currentPath[i]);
      if (!nextNode || !nextNode.children) return node;
      node = nextNode;
    }
    return node;
  }, [currentPath]);

  const totalValue = useMemo(() => sumNodeValues(currentData), [currentData]);

  const treemapRects = useMemo(() => {
    if (!currentData.children) return [];
    return squarify(currentData.children, 0, 0, 1000, 600, totalValue, currentPath);
  }, [currentData, totalValue, currentPath]);

  return (
    <div className="w-full h-[600px] bg-background text-foreground p-4 flex flex-col font-sans">
      <div className="flex items-center mb-2">
        <button 
          onClick={() => setCurrentPath(p => p.slice(0, -1))}
          disabled={currentPath.length <= 1}
          className="p-1 rounded-md transition-colors text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent mr-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-sm text-gray-400 flex items-center flex-wrap">
          {currentPath.map((p, i) => (
            <React.Fragment key={p}>
              <span>{p}</span>
              {i < currentPath.length - 1 && <ChevronRight className="w-4 h-4 mx-1" />}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="w-full flex-grow border border-border rounded-lg relative">
        <svg width="100%" height="100%" viewBox="0 0 1000 600">
          <AnimatePresence initial={false}>
            {treemapRects.map((rect) => (
              <motion.g
                key={rect.path.join("/")}
                initial={{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }}
                animate={{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }}
                exit={{ x: rect.x, y: rect.y, width: 0, height: 0 }}
                transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                onClick={() => {
                  if (rect.node.children) {
                    setCurrentPath(rect.path);
                  }
                }}
                onMouseEnter={() => setHoveredRect(rect)}
                onMouseLeave={() => setHoveredRect(null)}
              >
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill={colorScale(rect.path[1] || rect.node.name)}
                  stroke={hoveredRect?.path.join("/") === rect.path.join("/") ? "hsl(var(--primary))" : "hsl(var(--background))"}
                  strokeWidth={hoveredRect?.path.join("/") === rect.path.join("/") ? 3 : 2}
                  rx={4}
                />
                {rect.width > 80 && rect.height > 30 && (
                  <>
                    <clipPath id={`clip-${rect.path.join("-")}`}>
                      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
                    </clipPath>
                    <text
                      x={rect.x + 8}
                      y={rect.y + 20}
                      fontSize="14"
                      fontWeight="500"
                      fill="rgba(255, 255, 255, 0.9)"
                      clipPath={`url(#clip-${rect.path.join("-")})`}
                      style={{ pointerEvents: "none" }}
                    >
                      {rect.node.name}
                    </text>
                    {rect.width > 100 && rect.height > 40 && (
                        <text
                            x={rect.x + 8}
                            y={rect.y + 38}
                            fontSize="12"
                            fill="rgba(255, 255, 255, 0.6)"
                            clipPath={`url(#clip-${rect.path.join("-")})`}
                            style={{ pointerEvents: "none" }}
                        >
                            {sumNodeValues(rect.node).toLocaleString()} KB
                        </text>
                    )}
                  </>
                )}
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>
        {hoveredRect && (
          <div 
            className="absolute bg-background/80 backdrop-blur-sm border border-border text-foreground p-2 rounded-md text-sm shadow-lg pointer-events-none"
            style={{ 
              top: `${(hoveredRect.y / 600) * 100}%`, 
              left: `${(hoveredRect.x / 1000) * 100}%`, 
              transform: "translate(10px, 10px)" 
            }}
          >
            <div>{hoveredRect.path.join(" / ")}</div>
            <div>Size: {sumNodeValues(hoveredRect.node).toLocaleString()} KB</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreemapVisualization;
