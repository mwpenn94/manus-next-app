import DOMPurify from "dompurify";
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
    ChevronLeft, 
    ChevronRight, 
    ChevronDown,
    File as FileIcon, 
    Folder as FolderIcon, 
    FolderOpen as FolderOpenIcon,
    Search as SearchIcon,
    Copy as CopyIcon,
    GitCompareArrows as GitCompareArrowsIcon, 
    X,
    FileJson,
    FileCode2,
    FileText,
    Terminal,
    Check,
    ChevronUp
} from 'lucide-react';

// --- Mock Data ---
type FileType = 'file' | 'folder';
type FileExtension = 'js' | 'css' | 'html' | 'json' | 'md';

interface FileNode {
    id: string;
    name: string;
    type: FileType;
    extension?: FileExtension;
    content?: string;
    size?: number; // in bytes
    lastModified?: string;
    children?: FileNode[];
    diffContent?: string; // For diff view
}

const mockFileSystem: FileNode[] = [
    {
        id: 'root',
        name: 'my-webapp',
        type: 'folder',
        children: [
            {
                id: 'app.js',
                name: 'app.js',
                type: 'file',
                extension: 'js',
                size: 2048,
                lastModified: '2023-10-27T10:00:00Z',
                content: `// Welcome to the code viewer!\nimport React from 'react';\nimport './styles.css';\n\nconst GREETING = "Hello, World!";\n\nfunction App() {\n  // This is a simple component\n  return (\n    <div className="App">\n      <h1>{GREETING}</h1>\n      <p>Edit <code>src/app.js</code> and save to reload.</p>\n      <button onClick={() => alert('Clicked!')}>Click me</button>\n    </div>\n  );\n}\n\nexport default App;`,
                diffContent: `// Welcome to the code viewer!\nimport React, { useState } from 'react';\nimport './styles.css';\n\nconst GREETING = "Hello, Manus!"; // Changed greeting\n\nfunction App() {\n  const [count, setCount] = useState(0);\n  // This is a simple component\n  return (\n    <div className="App">\n      <h1>{GREETING}</h1>\n      <p>Edit <code>src/app.js</code> and save to reload.</p>\n      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>\n    </div>\n  );\n}\n\nexport default App;`
            },
            {
                id: 'styles.css',
                name: 'styles.css',
                type: 'file',
                extension: 'css',
                size: 1024,
                lastModified: '2023-10-26T14:30:00Z',
                content: `/* Basic App Styles */\nbody {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;\n  background-color: #f0f2f5;\n}\n\n.App {\n  text-align: center;\n  padding: 2rem;\n}\n\n.App h1 {\n  color: #1a202c;\n  font-size: 2.5rem;\n}`
            },
            {
                id: 'index.html',
                name: 'index.html',
                type: 'file',
                extension: 'html',
                size: 512,
                lastModified: '2023-10-25T09:15:00Z',
                content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>React App</title>\n    <link rel="stylesheet" href="styles.css">\n  </head>\n  <body>\n    <div id="root"></div>\n    <script src="app.js"></script>\n  </body>\n</html>`
            },
            {
                id: 'package.json',
                name: 'package.json',
                type: 'file',
                extension: 'json',
                size: 850,
                lastModified: '2023-10-27T11:20:00Z',
                content: `{\n  "name": "my-project",\n  "version": "0.1.0",\n  "private": true,\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "@manus/ui": "latest"\n  },\n  "scripts": {\n    "start": "react-scripts start",\n    "build": "react-scripts build"\n  }\n}`
            },
            {
                id: 'README.md',
                name: 'README.md',
                type: 'file',
                extension: 'md',
                size: 1500,
                lastModified: '2023-10-24T16:45:00Z',
                content: `# My Project\n\nThis is a sample project for the Code Viewer component.\n\n## Features\n\n- File tree navigation\n- Syntax highlighting\n- Tabs for open files\n\n> This is a blockquote.`
            }
        ]
    }
];

// --- Syntax Highlighting & Diff Logic ---
const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const highlightSyntax = (code: string, language: FileExtension) => {
    let highlightedCode = escapeHtml(code);
    if (language === 'md') {
        highlightedCode = highlightedCode
            .replace(/^# (.*$)/gim, '<span class="token-h1"># $1</span>')
            .replace(/^## (.*$)/gim, '<span class="token-h2">## $1</span>')
            .replace(/\*\*(.*?)\*\*/g, '<span class="token-bold">**$1**</span>')
            .replace(/`(.*?)`/g, '<span class="token-code">`$1`</span>')
            .replace(/^> (.*$)/gim, '<span class="token-blockquote">> $1</span>');
    } else if (language === 'json') {
        highlightedCode = highlightedCode
            .replace(/("[^"\\]*(?:\\.[^"\\]*)*")/g, (match, group) => {
                if (/:$/.test(highlightedCode.substring(0, highlightedCode.indexOf(match) + match.length))) {
                    return `<span class="token-key">${group}</span>`;
                }
                return `<span class="token-string">${group}</span>`;
            })
            .replace(/\b(true|false|null)\b/g, '<span class="token-keyword">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');
    } else {
        highlightedCode = highlightedCode
            .replace(/(\/\/.*|\/\*.*?\*\/)/g, '<span class="token-comment">$1</span>')
            .replace(/("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^’\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)/g, '<span class="token-string">$1</span>')
            .replace(/\b(import|from|export|default|const|let|var|function|return|if|else|switch|case|break|for|while|new|class|extends|super|true|false|null|async|await|try|catch|finally|document|window)\b/g, '<span class="token-keyword">$1</span>')
            .replace(/\b(px|rem|em|%|vh|vw)\b/g, '<span class="token-unit">$1</span>')
            .replace(/([{}\[\]();,.:=<>+\-*\/!&|?~])/g, '<span class="token-punctuation">$1</span>')
            .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>')
            .replace(/(&lt;\/?)([a-zA-Z0-9\-]+)/g, '$1<span class="token-tag">$2</span>');
    }
    return highlightedCode;
};

const createDiff = (oldStr: string, newStr: string) => {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    const result = [];
    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
        if (i < oldLines.length && i === j && oldLines[i] === newLines[j]) {
            result.push({ type: 'common', line: oldLines[i] });
            i++; j++;
        } else {
            const oldLineIndex = oldLines.indexOf(newLines[j], i);
            const newLineIndex = newLines.indexOf(oldLines[i], j);

            if (j < newLines.length && (oldLineIndex === -1 || (newLineIndex !== -1 && newLineIndex < oldLineIndex))) {
                result.push({ type: 'added', line: newLines[j] });
                j++;
            } else if (i < oldLines.length) {
                result.push({ type: 'removed', line: oldLines[i] });
                i++;
            }
        }
    }
    return result;
};

// --- Helper Components ---

const getFileIcon = (extension?: FileExtension) => {
    const style = { color: 'oklch(80% 0.05 280)' };
    switch (extension) {
        case 'js': return <FileCode2 className="w-4 h-4" style={{color: 'oklch(80% 0.19 90)'}} />;
        case 'css': return <FileCode2 className="w-4 h-4" style={{color: 'oklch(75% 0.2 250)'}} />;
        case 'html': return <FileCode2 className="w-4 h-4" style={{color: 'oklch(70% 0.2 30)'}} />;
        case 'json': return <FileJson className="w-4 h-4" style={{color: 'oklch(85% 0.15 150)'}} />;
        case 'md': return <FileText className="w-4 h-4" style={style} />;
        default: return <FileIcon className="w-4 h-4 text-slate-400" />;
    }
};

const CodeDisplay = React.memo(({ content, language, searchTerm }: { content: string; language: FileExtension; searchTerm: string }) => {
    const highlightedContent = useMemo(() => {
        let html = highlightSyntax(content, language);
        if (searchTerm) {
            const regex = new RegExp(`(${escapeHtml(searchTerm)})`, 'gi');
            html = html.replace(regex, '<mark class="bg-yellow-500/30 rounded">$1</mark>');
        }
        return html;
    }, [content, language, searchTerm]);

    const lines = content.split('\n');

    return (
        <ScrollArea className="h-full w-full bg-[#0d1117]">
            <div className="flex font-mono text-[13px] leading-relaxed p-4">
                <div className="text-right pr-4 text-white/30 select-none sticky top-0">
                    {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <pre className="flex-1 whitespace-pre-wrap break-words">
                    <code dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlightedContent) }} />
                </pre>
            </div>
        </ScrollArea>
    );
});

const DiffDisplay = React.memo(({ oldContent, newContent, language }: { oldContent: string; newContent: string; language: FileExtension }) => {
    const diff = useMemo(() => createDiff(oldContent, newContent), [oldContent, newContent]);

    return (
        <ScrollArea className="h-full w-full bg-[#0d1117]">
            <div className="flex font-mono text-[13px] leading-relaxed p-4">
                <pre className="flex-1 whitespace-pre-wrap break-words">
                    <code>
                        {diff.map((item, index) => {
                            const highlightedLine = highlightSyntax(item.line, language);
                            const baseClasses = "flex items-start";
                            const typeClasses = {
                                added: "bg-green-500/10 text-green-300",
                                removed: "bg-red-500/10 text-red-300",
                                common: "text-white/70"
                            };
                            const symbol = {
                                added: '+',
                                removed: '-',
                                common: ' '
                            };
                            return (
                                <div key={index} className={cn(baseClasses, typeClasses[item.type as keyof typeof typeClasses])}>
                                    <span className="w-6 select-none text-center">{symbol[item.type as keyof typeof symbol]}</span>
                                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlightedLine) }} />
                                </div>
                            );
                        })}
                    </code>
                </pre>
            </div>
        </ScrollArea>
    );
});

// --- Main Component ---

export default function CodeViewerPanel() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
    const [openFiles, setOpenFiles] = useState<FileNode[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isDiffView, setIsDiffView] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const activeFile = useMemo(() => openFiles.find(f => f.id === activeFileId), [openFiles, activeFileId]);

    useEffect(() => {
        if (isSearchVisible) {
            searchInputRef.current?.focus();
        }
    }, [isSearchVisible]);

    const handleCopy = useCallback(() => {
        if (activeFile?.content) {
            navigator.clipboard.writeText(activeFile.content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    }, [activeFile]);

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
            return next;
        });
    }, []);

    const openFile = useCallback((file: FileNode) => {
        if (file.type === 'folder') return;
        if (!openFiles.some(f => f.id === file.id)) {
            setOpenFiles(prev => [...prev, file]);
        }
        setActiveFileId(file.id);
    }, [openFiles]);

    const closeFile = useCallback((fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenFiles(prev => {
            const next = prev.filter(f => f.id !== fileId);
            if (activeFileId === fileId) {
                setActiveFileId(next.length > 0 ? next[next.length - 1].id : null);
            }
            return next;
        });
    }, [activeFileId]);

    const renderFileTree = (nodes: FileNode[], level = 0) => {
        return nodes.map(node => {
            const isExpanded = expandedFolders.has(node.id);
            const isFolder = node.type === 'folder';
            const isActive = !isFolder && activeFileId === node.id;

            return (
                <div key={node.id}>
                    <div 
                        className={cn(
                            "flex items-center py-1.5 px-2 cursor-pointer hover:bg-white/5 rounded-md transition-colors text-sm",
                            isActive && "bg-blue-500/20 text-white"
                        )}
                        style={{ paddingLeft: `${level * 16 + 8}px` }}
                        onClick={() => isFolder ? toggleFolder(node.id) : openFile(node)}
                    >
                        {isFolder ? (
                            <ChevronDown className={cn("w-4 h-4 mr-1 transition-transform", !isExpanded && "-rotate-90")} />
                        ) : <div className="w-4 mr-1"/>}
                        {isFolder ? 
                            (isExpanded ? <FolderOpenIcon className="w-4 h-4 mr-2 text-blue-400" /> : <FolderIcon className="w-4 h-4 mr-2 text-blue-400" />) : 
                            <span className="mr-2">{getFileIcon(node.extension)}</span>
                        }
                        <span className="truncate">{node.name}</span>
                    </div>
                    {isFolder && isExpanded && node.children && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            {renderFileTree(node.children, level + 1)}
                        </motion.div>
                    )}
                </div>
            );
        });
    };

    return (
        <TooltipProvider>
            <style>{`
                .token-comment { color: oklch(60% 0.05 150); font-style: italic; }
                .token-string { color: oklch(80% 0.15 150); }
                .token-keyword { color: oklch(70% 0.25 280); font-weight: 500; }
                .token-number { color: oklch(80% 0.18 100); }
                .token-punctuation { color: oklch(70% 0.05 250); }
                .token-tag { color: oklch(70% 0.25 30); }
                .token-key { color: oklch(75% 0.2 250); }
                .token-h1 { color: oklch(80% 0.2 280); font-weight: 600; }
                .token-h2 { color: oklch(75% 0.18 280); font-weight: 600; }
                .token-bold { font-weight: 600; }
                .token-code { background-color: oklch(25% 0.02 250); padding: 0.1em 0.3em; border-radius: 4px; }
                .token-blockquote { border-left: 3px solid oklch(50% 0.1 250); padding-left: 1em; color: oklch(70% 0.05 250); }
                .token-unit { color: oklch(70% 0.15 180); }
            `}</style>
            <Card className="w-full h-[80vh] min-h-[600px] flex flex-col border border-white/10 bg-[#0d1117] text-[#c9d1d9] overflow-hidden rounded-xl shadow-2xl font-sans">
                <div className="flex-grow flex overflow-hidden">
                    <AnimatePresence initial={false}>
                        {!isSidebarCollapsed && (
                            <motion.div
                                initial={{ width: 250, opacity: 1, padding: '0.5rem' }}
                                animate={{ width: 250, opacity: 1, padding: '0.5rem' }}
                                exit={{ width: 0, opacity: 0, padding: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                                className="h-full border-r border-white/10 bg-[#010409] flex flex-col overflow-hidden"
                            >
                                <div className="p-2 text-xs font-semibold tracking-wider text-white/50 uppercase flex items-center justify-between">
                                    <span>Explorer</span>
                                </div>
                                <ScrollArea className="flex-grow pr-2">
                                    {renderFileTree(mockFileSystem)}
                                </ScrollArea>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex-grow flex flex-col min-w-0 relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 h-7 w-7 rounded-full bg-[#21262d] border border-white/10 hover:bg-[#30363d] text-white/70 shadow-md"
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        >
                            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>

                        <div className="flex-shrink-0 flex justify-between items-center bg-[#0d1117] border-b border-white/10">
                            <div className="flex overflow-x-auto no-scrollbar">
                                {openFiles.map(file => (
                                    <div
                                        key={file.id}
                                        className={cn(
                                            "flex items-center px-4 py-2 cursor-pointer border-r border-white/10 min-w-[120px] max-w-[200px] group transition-colors",
                                            activeFileId === file.id ? "bg-[#161b22] border-t-2 border-t-blue-500 text-white" : "bg-transparent text-white/60 hover:bg-white/5"
                                        )}
                                        onClick={() => setActiveFileId(file.id)}
                                    >
                                        <span className="mr-2 flex-shrink-0">{getFileIcon(file.extension)}</span>
                                        <span className="truncate text-sm flex-grow">{file.name}</span>
                                        <button 
                                            className="ml-2 p-0.5 rounded-md opacity-50 group-hover:opacity-100 hover:bg-white/10 transition-all"
                                            onClick={(e) => closeFile(file.id, e)}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center px-2 space-x-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSearchVisible(v => !v)} disabled={!activeFile}>
                                            <SearchIcon className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Search in file</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} disabled={!activeFile}>
                                            {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy to clipboard</TooltipContent>
                                </Tooltip>
                                <div className="flex items-center space-x-2 pl-2">
                                    <label htmlFor="diff-toggle" className="text-sm text-white/60">Diff</label>
                                    <Switch id="diff-toggle" checked={isDiffView} onCheckedChange={setIsDiffView} disabled={!activeFile?.diffContent} />
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow relative bg-[#0d1117] overflow-hidden">
                            <AnimatePresence mode="wait">
                                {activeFile ? (
                                    <motion.div 
                                        key={`${activeFile.id}-${isDiffView}`}
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1, transition: { duration: 0.2 } }} 
                                        exit={{ opacity: 0, transition: { duration: 0.1 } }} 
                                        className="absolute inset-0"
                                    >
                                        {isDiffView && activeFile.diffContent ? (
                                            <DiffDisplay oldContent={activeFile.content || ''} newContent={activeFile.diffContent || ''} language={activeFile.extension || 'js'} />
                                        ) : (
                                            <CodeDisplay content={activeFile.content || ''} language={activeFile.extension || 'js'} searchTerm={searchTerm} />
                                        )}
                                    </motion.div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                                        <Terminal className="w-16 h-16 mb-4 opacity-50" />
                                        <p className="text-lg">Select a file to view</p>
                                    </div>
                                )}
                            </AnimatePresence>
                            <AnimatePresence>
                                {isSearchVisible && activeFile && (
                                    <motion.div 
                                        initial={{ y: -50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -50, opacity: 0 }}
                                        className="absolute top-2 right-2 w-72 bg-[#161b22] border border-white/10 rounded-lg shadow-lg p-2 z-10"
                                    >
                                        <div className="flex items-center">
                                            <Input 
                                                ref={searchInputRef}
                                                type="text" 
                                                placeholder="Search..." 
                                                className="bg-transparent border-0 h-8 focus-visible:ring-0"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronUp className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronDown className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsSearchVisible(false)}><X className="h-4 w-4"/></Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex-shrink-0 h-7 bg-[#010409] border-t border-white/10 flex items-center justify-between px-3 text-xs text-white/50">
                            <div className="flex items-center space-x-4">
                                <span>{activeFile ? `Ln 1, Col 1` : 'Ready'}</span>
                                {activeFile && <span>{`Size: ${((activeFile.size || 0) / 1024).toFixed(2)} KB`}</span>}
                            </div>
                            <div className="flex items-center space-x-4">
                                {activeFile && <span>{new Date((activeFile.lastModified || Date.now())).toLocaleDateString()}</span>}
                                <span>UTF-8</span>
                                <span>{activeFile?.extension?.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </TooltipProvider>
    );
}
