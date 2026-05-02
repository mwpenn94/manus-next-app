import { useState, useCallback, useMemo } from "react";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Search,
  FileCode,
  FileText,
  FileImage,
  FileCog,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  language?: string;
  modified?: boolean;
}

interface WebAppFileTreePanelProps {
  projectExternalId?: string;
}

function getFileIcon(name: string, type: string): React.JSX.Element {
  if (type === "directory") return <Folder className="w-4 h-4 text-blue-400" />;
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js": case "jsx": case "ts": case "tsx": return <FileCode className="w-4 h-4 text-yellow-400" />;
    case "css": case "scss": return <FileCode className="w-4 h-4 text-blue-300" />;
    case "html": return <FileCode className="w-4 h-4 text-orange-400" />;
    case "json": return <FileCog className="w-4 h-4 text-green-400" />;
    case "md": return <FileText className="w-4 h-4 text-muted-foreground" />;
    case "png": case "jpg": case "svg": case "ico": return <FileImage className="w-4 h-4 text-purple-400" />;
    default: return <File className="w-4 h-4 text-muted-foreground" />;
  }
}

function buildTreeFromPaths(paths: string[]): FileNode[] {
  const root: Record<string, any> = {};
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = i === parts.length - 1 ? null : {};
      if (current[part] !== null) current = current[part];
    }
  }
  function toNodes(obj: Record<string, any>, prefix: string): FileNode[] {
    return Object.entries(obj).map(([name, children]) => {
      const id = prefix ? `${prefix}/${name}` : name;
      if (children === null) return { id, name, type: "file" as const };
      return { id, name, type: "directory" as const, children: toNodes(children, id) };
    }).sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
  return toNodes(root, "");
}

const DEFAULT_PATHS = [
  "client/src/App.tsx", "client/src/main.tsx", "client/src/index.css",
  "client/src/pages/Home.tsx", "client/src/components/ui/button.tsx",
  "client/index.html", "server/routers.ts", "server/db.ts",
  "drizzle/schema.ts", "package.json", "vite.config.ts", "tsconfig.json",
];

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  expandedDirs: Set<string>;
  selectedFile: string | null;
  onToggleDir: (id: string) => void;
  onSelectFile: (id: string) => void;
}

function TreeNode({ node, depth, expandedDirs, selectedFile, onToggleDir, onSelectFile }: TreeNodeProps): React.JSX.Element {
  const isExpanded = expandedDirs.has(node.id);
  const isSelected = selectedFile === node.id;
  return (
    <div>
      <button
        className={cn(
          "w-full flex items-center gap-1.5 py-1 px-2 text-xs hover:bg-accent/50 transition-colors rounded-sm",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => node.type === "directory" ? onToggleDir(node.id) : onSelectFile(node.id)}
      >
        {node.type === "directory" ? (
          <>
            {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
            {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" /> : <Folder className="w-4 h-4 text-blue-400 shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(node.name, node.type)}
          </>
        )}
        <span className="truncate">{node.name}</span>
        {node.modified && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-auto shrink-0" />}
      </button>
      {node.type === "directory" && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} expandedDirs={expandedDirs} selectedFile={selectedFile} onToggleDir={onToggleDir} onSelectFile={onSelectFile} />
          ))}
        </div>
      )}
    </div>
  );
}

function findFile(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFile(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export default function WebAppFileTreePanel({ projectExternalId }: WebAppFileTreePanelProps): React.JSX.Element {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["client", "client/src", "server"]));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editedContent, setEditedContent] = useState<Map<string, string>>(new Map());

  const { data: project, isLoading } = trpc.webappProject.get.useQuery(
    { externalId: projectExternalId ?? "" },
    { enabled: !!projectExternalId }
  );

  const tree = useMemo(() => {
    if (!project) return buildTreeFromPaths(DEFAULT_PATHS);
    const fileStructure = (project as any).fileStructure || (project as any).files || [];
    if (Array.isArray(fileStructure) && fileStructure.length > 0) {
      if (typeof fileStructure[0] === "string") return buildTreeFromPaths(fileStructure);
      return fileStructure as FileNode[];
    }
    return buildTreeFromPaths(DEFAULT_PATHS);
  }, [project]);

  const handleToggleDir = useCallback((id: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectFile = useCallback((id: string) => {
    setSelectedFile(id);
    setOpenTabs((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      if (selectedFile === id) setSelectedFile(next.length > 0 ? next[next.length - 1] : null);
      return next;
    });
  }, [selectedFile]);

  const currentFile = useMemo(() => selectedFile ? findFile(tree, selectedFile) : null, [selectedFile, tree]);
  const currentContent = useMemo(() => {
    if (!selectedFile || !currentFile) return "";
    return editedContent.get(selectedFile) ?? currentFile.content ?? "";
  }, [selectedFile, currentFile, editedContent]);

  const handleContentChange = useCallback((value: string) => {
    if (selectedFile) setEditedContent((prev) => new Map(prev).set(selectedFile, value));
  }, [selectedFile]);

  // Filter tree by search
  function filterTree(nodes: FileNode[], query: string): FileNode[] {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.type === "file" && node.name.toLowerCase().includes(q)) acc.push(node);
      else if (node.type === "directory") {
        const filtered = filterTree(node.children || [], query);
        if (filtered.length > 0) acc.push({ ...node, children: filtered });
      }
      return acc;
    }, []);
  }

  const filteredTree = filterTree(tree, searchQuery);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      <div className="flex h-full">
        {/* File Tree Sidebar */}
        <div className="w-56 border-r border-border flex flex-col bg-card/30">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {filteredTree.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} expandedDirs={expandedDirs} selectedFile={selectedFile} onToggleDir={handleToggleDir} onSelectFile={handleSelectFile} />
            ))}
          </div>
          <div className="p-2 border-t border-border flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-accent transition-colors" title="New File">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button className="p-1.5 rounded hover:bg-accent transition-colors" title="New Folder">
              <Folder className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button className="p-1.5 rounded hover:bg-accent transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex items-center border-b border-border bg-card/30 overflow-x-auto">
            {openTabs.map((tabId) => {
              const file = findFile(tree, tabId);
              if (!file) return null;
              return (
                <div
                  key={tabId}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs border-r border-border cursor-pointer transition-colors",
                    selectedFile === tabId ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setSelectedFile(tabId)}
                >
                  {getFileIcon(file.name, file.type)}
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  {editedContent.has(tabId) && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleCloseTab(tabId); }}
                    className="ml-1 p-0.5 rounded hover:bg-accent transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-auto">
            {currentFile ? (
              <div className="h-full">
                <textarea
                  value={currentContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(e.target.value)}
                  className="w-full h-full bg-[#0d1117] text-green-400/80 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <p>Select a file to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
