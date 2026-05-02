import { useState, useCallback, useMemo } from "react";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Search,
  FileCode,
  FileText,
  FileImage,
  FileCog,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  language?: string;
  modified?: boolean;
}

const MOCK_FILE_TREE: FileNode[] = [
  {
    id: "src", name: "src", type: "directory", children: [
      { id: "src/index.html", name: "index.html", type: "file", content: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>My App</title>\n  <link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n  <div id=\"app\"></div>\n  <script type=\"module\" src=\"app.js\"></script>\n</body>\n</html>", language: "html" },
      { id: "src/styles.css", name: "styles.css", type: "file", content: ":root {\n  --primary: #3b82f6;\n  --bg: #0a0a0f;\n  --text: #e5e5e5;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  background: var(--bg);\n  color: var(--text);\n  margin: 0;\n  padding: 2rem;\n}", language: "css" },
      { id: "src/app.js", name: "app.js", type: "file", content: "import { createApp } from './lib/framework.js';\n\nconst app = createApp({\n  root: '#app',\n  data: { count: 0 },\n  methods: {\n    increment() { this.count++; },\n    decrement() { this.count--; }\n  }\n});\n\napp.mount();", language: "javascript", modified: true },
      {
        id: "src/components", name: "components", type: "directory", children: [
          { id: "src/components/Header.jsx", name: "Header.jsx", type: "file", content: "export function Header({ title }) {\n  return (\n    <header className=\"header\">\n      <h1>{title}</h1>\n      <nav>\n        <a href=\"/\">Home</a>\n        <a href=\"/about\">About</a>\n      </nav>\n    </header>\n  );\n}", language: "jsx" },
          { id: "src/components/Footer.jsx", name: "Footer.jsx", type: "file", content: "export function Footer() {\n  return (\n    <footer className=\"footer\">\n      <p>&copy; 2026 My App</p>\n    </footer>\n  );\n}", language: "jsx" },
        ]
      },
      {
        id: "src/lib", name: "lib", type: "directory", children: [
          { id: "src/lib/framework.js", name: "framework.js", type: "file", content: "// Lightweight reactive framework\nexport function createApp(options) {\n  const state = reactive(options.data);\n  return { mount() { render(state, options.root); } };\n}\n\nfunction reactive(obj) { /* ... */ }\nfunction render(state, el) { /* ... */ }", language: "javascript" },
          { id: "src/lib/utils.js", name: "utils.js", type: "file", content: "export function debounce(fn, ms) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}\n\nexport function formatDate(d) {\n  return new Intl.DateTimeFormat().format(d);\n}", language: "javascript" },
        ]
      },
    ]
  },
  {
    id: "public", name: "public", type: "directory", children: [
      { id: "public/favicon.ico", name: "favicon.ico", type: "file", language: "binary" },
      { id: "public/robots.txt", name: "robots.txt", type: "file", content: "User-agent: *\nAllow: /", language: "text" },
    ]
  },
  { id: "package.json", name: "package.json", type: "file", content: "{\n  \"name\": \"my-app\",\n  \"version\": \"1.0.0\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"preview\": \"vite preview\"\n  },\n  \"dependencies\": {\n    \"react\": \"^19.0.0\"\n  }\n}", language: "json" },
  { id: "README.md", name: "README.md", type: "file", content: "# My App\n\nA modern web application built with Manus.\n\n## Getting Started\n\n```bash\nnpm install\nnpm run dev\n```", language: "markdown" },
  { id: "vite.config.js", name: "vite.config.js", type: "file", content: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 3000 }\n});", language: "javascript" },
];

function getFileIcon(name: string, type: string): React.JSX.Element {
  if (type === "directory") return <Folder className="w-4 h-4 text-blue-400" />;
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <FileCode className="w-4 h-4 text-yellow-400" />;
    case "css":
    case "scss":
      return <FileCode className="w-4 h-4 text-blue-300" />;
    case "html":
      return <FileCode className="w-4 h-4 text-orange-400" />;
    case "json":
      return <FileCog className="w-4 h-4 text-green-400" />;
    case "md":
      return <FileText className="w-4 h-4 text-muted-foreground" />;
    case "png":
    case "jpg":
    case "svg":
    case "ico":
      return <FileImage className="w-4 h-4 text-purple-400" />;
    default:
      return <File className="w-4 h-4 text-muted-foreground" />;
  }
}

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
        onClick={() => {
          if (node.type === "directory") {
            onToggleDir(node.id);
          } else {
            onSelectFile(node.id);
          }
        }}
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
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              selectedFile={selectedFile}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
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

export default function WebAppFileTreePanel(): React.JSX.Element {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["src", "src/components", "src/lib"]));
  const [selectedFile, setSelectedFile] = useState<string | null>("src/app.js");
  const [openTabs, setOpenTabs] = useState<string[]>(["src/app.js", "src/index.html"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editedContent, setEditedContent] = useState<Map<string, string>>(new Map());

  const handleToggleDir = useCallback((id: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectFile = useCallback((id: string) => {
    setSelectedFile(id);
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      if (selectedFile === id) {
        setSelectedFile(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  }, [selectedFile]);

  const currentFile = useMemo(() => {
    if (!selectedFile) return null;
    return findFile(MOCK_FILE_TREE, selectedFile);
  }, [selectedFile]);

  const currentContent = useMemo(() => {
    if (!selectedFile || !currentFile) return "";
    return editedContent.get(selectedFile) ?? currentFile.content ?? "";
  }, [selectedFile, currentFile, editedContent]);

  const handleContentChange = useCallback((value: string) => {
    if (selectedFile) {
      setEditedContent((prev) => new Map(prev).set(selectedFile, value));
    }
  }, [selectedFile]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      <div className="flex h-full">
        {/* File Tree Sidebar */}
        <div className="w-56 border-r border-border flex flex-col bg-card/30">
          {/* Search */}
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
          {/* Tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {MOCK_FILE_TREE.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedDirs={expandedDirs}
                selectedFile={selectedFile}
                onToggleDir={handleToggleDir}
                onSelectFile={handleSelectFile}
              />
            ))}
          </div>
          {/* Actions */}
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
              const file = findFile(MOCK_FILE_TREE, tabId);
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
                  <span>{file.name}</span>
                  {editedContent.has(tabId) && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleCloseTab(tabId);
                    }}
                    className="ml-1 p-0.5 rounded hover:bg-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-hidden">
            {currentFile ? (
              <div className="h-full flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
                  <span className="text-[10px] text-muted-foreground font-mono">{selectedFile}</span>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-accent transition-colors" title="Copy">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1 rounded hover:bg-accent transition-colors" title="Save">
                      <Save className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                {/* Code area */}
                <div className="flex-1 overflow-auto">
                  <textarea
                    value={currentContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(e.target.value)}
                    className="w-full h-full p-4 bg-background text-foreground font-mono text-xs leading-relaxed resize-none focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a file to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
