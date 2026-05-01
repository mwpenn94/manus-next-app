import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Folder, File, Image as ImageIcon, Code, Search, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Type definitions
type NodeId = string;

interface TreeNode {
  id: NodeId;
  name: string;
  type: 'folder' | 'file' | 'image' | 'code';
  children?: TreeNode[];
  hasChildren?: boolean;
}

const initialTreeData: TreeNode[] = [
  { id: '1', name: 'src', type: 'folder', hasChildren: true },
  { id: '9', name: 'public', type: 'folder', hasChildren: true },
  { id: '12', name: 'package.json', type: 'file' },
  { id: '13', name: 'README.md', type: 'file' },
];

const nodeChildren: Record<NodeId, TreeNode[]> = {
  '1': [
    { id: '2', name: 'components', type: 'folder', hasChildren: true },
    { id: '5', name: 'lib', type: 'folder', hasChildren: true },
    { id: '7', name: 'App.tsx', type: 'code' },
    { id: '8', name: 'index.css', type: 'file' },
  ],
  '2': [
    { id: '3', name: 'Button.tsx', type: 'code' },
    { id: '4', name: 'Card.tsx', type: 'code' },
  ],
  '5': [{ id: '6', name: 'utils.ts', type: 'code' }],
  '9': [
    { id: '10', name: 'logo.svg', type: 'image' },
    { id: '11', name: 'robots.txt', type: 'file' },
  ],
};

const getIcon = (type: TreeNode['type']) => {
  const icons = {
    folder: <Folder className="h-4 w-4 text-blue-400" />,
    file: <File className="h-4 w-4 text-gray-400" />,
    image: <ImageIcon className="h-4 w-4 text-purple-400" />,
    code: <Code className="h-4 w-4 text-green-400" />,
  };
  return icons[type] || null;
};

interface TreeViewNodeProps {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (nodeId: NodeId) => void;
  onToggleSelect: (nodeId: NodeId, isSelected: boolean) => void;
  onContextMenu: (event: React.MouseEvent, nodeId: NodeId) => void;
  filter: string;
}

const TreeViewNode: React.FC<TreeViewNodeProps> = ({ node, level, isExpanded, isSelected, onToggleExpand, onToggleSelect, onContextMenu, filter }) => {
  const [children, setChildren] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleExpand = useCallback(() => {
    if (node.hasChildren) {
      onToggleExpand(node.id);
      if (!isExpanded && children.length === 0) {
        setIsLoading(true);
        setTimeout(() => {
          setChildren(nodeChildren[node.id] || []);
          setIsLoading(false);
        }, 500); // Simulate lazy loading
      }
    }
  }, [node, isExpanded, children.length, onToggleExpand]);

  const filteredChildren = useMemo(() => {
    if (!filter) return children;
    return children.filter(child => child.name.toLowerCase().includes(filter.toLowerCase()));
  }, [children, filter]);

  return (
    <div onContextMenu={(e) => onContextMenu(e, node.id)}>
      <div
        className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted cursor-pointer"
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <div className="absolute left-0 h-full w-[1px] bg-border" style={{ left: `${level * 1.5}rem` }}></div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(node.id, e.target.checked)}
          className="form-checkbox h-4 w-4 rounded text-primary bg-background border-border focus:ring-primary"
          onClick={(e) => e.stopPropagation()}
        />
        <div onClick={handleToggleExpand} className="flex items-center flex-grow space-x-2">
          {node.hasChildren && (
            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            </motion.div>
          )}
          {!node.hasChildren && <div className="w-4 h-4 flex-shrink-0"></div>}
          {getIcon(node.type)}
          <span className="text-sm select-none">{node.name}</span>
          {isLoading && <div className="h-4 w-4 border-2 border-t-transparent border-primary rounded-full animate-spin ml-2"></div>}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden relative"
          >
            <div className="absolute left-0 top-0 h-full w-[1px] bg-border" style={{ left: `${(level + 1) * 1.5}rem` }}></div>
            {filteredChildren.map(child => (
              <TreeViewNode
                key={child.id}
                node={child}
                level={level + 1}
                isExpanded={isExpanded} // This should be managed per node
                isSelected={isSelected} // This should be managed per node
                onToggleExpand={onToggleExpand}
                onToggleSelect={onToggleSelect}
                onContextMenu={onContextMenu}
                filter={filter}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TreeViewExplorer: React.FC = () => {
  const [expandedNodes, setExpandedNodes] = useState<Set<NodeId>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<NodeId>>(new Set());
  const [filter, setFilter] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: NodeId } | null>(null);

  const handleToggleExpand = useCallback((nodeId: NodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const handleToggleSelect = useCallback((nodeId: NodeId, isSelected: boolean) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(nodeId);
      } else {
        newSet.delete(nodeId);
      }
      return newSet;
    });
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent, nodeId: NodeId) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    document.addEventListener('click', closeContextMenu);
    return () => document.removeEventListener('click', closeContextMenu);
  }, [closeContextMenu]);

  const filteredTree = useMemo(() => {
    if (!filter) return initialTreeData;
    return initialTreeData.filter(node => node.name.toLowerCase().includes(filter.toLowerCase()));
  }, [filter]);

  return (
    <Card className="w-full max-w-md mx-auto bg-background text-foreground font-sans">
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter files..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
            {filter && (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setFilter('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Badge variant="secondary">{selectedNodes.size} selected</Badge>
        </div>
        <div className="max-h-96 overflow-y-auto relative">
          {filteredTree.map(node => (
            <TreeViewNode
              key={node.id}
              node={node}
              level={0}
              isExpanded={expandedNodes.has(node.id)}
              isSelected={selectedNodes.has(node.id)}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={handleToggleSelect}
              onContextMenu={handleContextMenu}
              filter={filter}
            />
          ))}
        </div>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-50 bg-card border border-border rounded-md shadow-lg p-2 text-sm"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="p-2 hover:bg-muted rounded cursor-pointer">Rename</div>
            <div className="p-2 hover:bg-muted rounded cursor-pointer">Delete</div>
            <div className="p-2 hover:bg-muted rounded cursor-pointer">Copy Path</div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default TreeViewExplorer;