import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, FileCode2, FileBarChart, FileJson2, ImageIcon, Folder as FolderIcon, ChevronRight, Search, Plus, Trash2, Tag as TagIcon, MoreVertical, ArrowUpDown, History, X, UploadCloud, GripVertical, FileArchive } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type FileType = 'PDF' | 'DOC' | 'TXT' | 'CSV' | 'JSON' | 'IMAGE';

interface FileVersion {
  version: number;
  date: string;
  size: number;
}

interface File {
  id: string;
  name: string;
  type: FileType;
  size: number;
  createdAt: string;
  versions: FileVersion[];
  tags: string[];
  content: string;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

// --- MOCK DATA ---
const mockFolders: Folder[] = [
  { id: '1', name: 'Company Docs', parentId: null },
  { id: '2', name: 'Q2 Financials', parentId: '1' },
  { id: '3', name: 'Research Papers', parentId: null },
  { id: '4', name: 'Training Materials', parentId: null },
];

const mockFiles: File[] = [
  { id: 'file-1', name: 'Onboarding_Manual_v2.pdf', type: 'PDF', size: 2.5 * 1024 * 1024, createdAt: '2026-04-15T10:00:00Z', versions: [{ version: 2, date: '2026-04-15T10:00:00Z', size: 2.5 * 1024 * 1024 }, { version: 1, date: '2026-03-20T14:30:00Z', size: 2.1 * 1024 * 1024 }], tags: ['onboarding', 'hr', 'guide'], content: 'Welcome to the team! This document outlines the company policies, culture, and your first-week tasks.', folderId: '1' },
  { id: 'file-2', name: 'Brand_Assets.zip', type: 'IMAGE', size: 15.2 * 1024 * 1024, createdAt: '2026-04-10T11:20:00Z', versions: [{ version: 1, date: '2026-04-10T11:20:00Z', size: 15.2 * 1024 * 1024 }], tags: ['design', 'marketing', 'logos'], content: 'This archive contains all official brand assets, including logos, color palettes, and font guidelines.', folderId: '1' },
  { id: 'file-3', name: 'Q2_Projections.csv', type: 'CSV', size: 128 * 1024, createdAt: '2026-04-01T09:00:00Z', versions: [{ version: 1, date: '2026-04-01T09:00:00Z', size: 128 * 1024 }], tags: ['finance', 'q2', 'forecast'], content: 'Date,Revenue,Expenses,Profit\n2026-04-01,50000,30000,20000', folderId: '2' },
  { id: 'file-4', name: 'Expense_Report_April.pdf', type: 'PDF', size: 800 * 1024, createdAt: '2026-05-01T14:00:00Z', versions: [{ version: 1, date: '2026-05-01T14:00:00Z', size: 800 * 1024 }], tags: ['finance', 'expenses', 'april'], content: 'Summary of all departmental expenses for April 2026.', folderId: '2' },
  { id: 'file-5', name: 'LLM_Scaling_Laws.pdf', type: 'PDF', size: 4.1 * 1024 * 1024, createdAt: '2026-03-10T18:45:00Z', versions: [{ version: 3, date: '2026-03-10T18:45:00Z', size: 4.1 * 1024 * 1024 }, { version: 2, date: '2026-03-09T12:00:00Z', size: 3.9 * 1024 * 1024 }, { version: 1, date: '2026-03-05T09:20:00Z', size: 3.5 * 1024 * 1024 }], tags: ['ai', 'research', 'llm'], content: 'This paper investigates the empirical scaling laws for language model performance.', folderId: '3' },
  { id: 'file-6', name: 'Transformer_Architecture.docx', type: 'DOC', size: 1.2 * 1024 * 1024, createdAt: '2026-02-20T10:00:00Z', versions: [{ version: 1, date: '2026-02-20T10:00:00Z', size: 1.2 * 1024 * 1024 }], tags: ['ai', 'deep-learning'], content: 'An in-depth explanation of the Transformer model architecture.', folderId: '3' },
  { id: 'file-7', name: 'Market_Analysis_AI.json', type: 'JSON', size: 512 * 1024, createdAt: '2026-04-25T16:20:00Z', versions: [{ version: 1, date: '2026-04-25T16:20:00Z', size: 512 * 1024 }], tags: ['market-research', 'competitors'], content: '{"marketSize": "$50B", "keyPlayers": ["OpenAI", "Google", "Anthropic"]}', folderId: '3' },
  { id: 'file-8', name: 'Advanced_React_Patterns.txt', type: 'TXT', size: 50 * 1024, createdAt: '2026-01-15T09:30:00Z', versions: [{ version: 1, date: '2026-01-15T09:30:00Z', size: 50 * 1024 }], tags: ['react', 'frontend', 'training'], content: 'This guide covers advanced React patterns including HOCs, Render Props, and custom hooks.', folderId: '4' },
  { id: 'file-9', name: 'State_Management_Workshop.pdf', type: 'PDF', size: 3.1 * 1024 * 1024, createdAt: '2026-01-20T14:00:00Z', versions: [{ version: 1, date: '2026-01-20T14:00:00Z', size: 3.1 * 1024 * 1024 }], tags: ['react', 'state-management'], content: 'Slides from the state management workshop.', folderId: '4' },
  { id: 'file-10', name: 'Security_Best_Practices.docx', type: 'DOC', size: 950 * 1024, createdAt: '2026-02-01T11:00:00Z', versions: [{ version: 2, date: '2026-02-01T11:00:00Z', size: 950 * 1024 }, { version: 1, date: '2025-11-10T10:00:00Z', size: 850 * 1024 }], tags: ['security', 'development'], content: 'A comprehensive guide to security best practices for web developers.', folderId: '4' },
  { id: 'file-11', name: 'README.md', type: 'TXT', size: 5 * 1024, createdAt: '2025-12-10T12:00:00Z', versions: [{ version: 1, date: '2025-12-10T12:00:00Z', size: 5 * 1024 }], tags: ['documentation'], content: '# Knowledge Base', folderId: null },
  { id: 'file-12', name: 'Agent_Performance.png', type: 'IMAGE', size: 1.8 * 1024 * 1024, createdAt: '2026-05-01T17:00:00Z', versions: [{ version: 1, date: '2026-05-01T17:00:00Z', size: 1.8 * 1024 * 1024 }], tags: ['dashboard', 'metrics'], content: 'A screenshot of the main agent performance dashboard.', folderId: null },
  { id: 'file-13', name: 'Q1_2026_Retrospective.docx', type: 'DOC', size: 600 * 1024, createdAt: '2026-04-05T15:00:00Z', versions: [{ version: 1, date: '2026-04-05T15:00:00Z', size: 600 * 1024 }], tags: ['retrospective', 'q1'], content: 'Notes and action items from the Q1 2026 retrospective meeting.', folderId: null },
  { id: 'file-14', name: 'Competitive_Matrix.csv', type: 'CSV', size: 256 * 1024, createdAt: '2026-04-18T13:25:00Z', versions: [{ version: 1, date: '2026-04-18T13:25:00Z', size: 256 * 1024 }], tags: ['competitors', 'product'], content: 'Feature,SovereignAI,CompetitorA,CompetitorB\nAutonomous Agents,Yes,Yes,No', folderId: null },
  { id: 'file-15', name: 'API_Keys.json', type: 'JSON', size: 2 * 1024, createdAt: '2026-01-01T00:00:00Z', versions: [{ version: 1, date: '2026-01-01T00:00:00Z', size: 2 * 1024 }], tags: ['secrets', 'api'], content: '{"OPENAI_API_KEY": "sk-xxxx..."}', folderId: null },
];

// --- HELPER COMPONENTS & FUNCTIONS ---
const FileTypeIcon = ({ type, className }: { type: FileType; className?: string }) => {
  const Icon = { PDF: FileText, DOC: FileArchive, TXT: FileText, CSV: FileBarChart, JSON: FileCode2, IMAGE: ImageIcon }[type];
  return <Icon className={cn("h-5 w-5 text-gray-500", className)} />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const renderFolders = (folders: Folder[], parentId: string | null, level = 0, currentFolderId: string | null, handleFolderClick: (id: string | null) => void) => {
    const childFolders = folders.filter(f => f.parentId === parentId);
    return childFolders.map(folder => (
        <div key={folder.id}>
            <button onClick={() => handleFolderClick(folder.id)} style={{ paddingLeft: `${12 + level * 16}px` }} className={cn('w-full text-left py-2 rounded-md text-sm font-medium flex items-center', currentFolderId === folder.id ? 'bg-gray-100' : 'hover:bg-gray-50')}>
                <FolderIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                <span className="truncate">{folder.name}</span>
            </button>
            {renderFolders(folders, folder.id, level + 1, currentFolderId, handleFolderClick)}
        </div>
    ));
};

// --- MAIN COMPONENT ---
export default function KnowledgeBaseManager() {
  const [files, setFiles] = useState<File[]>(mockFiles);
  const [folders, setFolders] = useState<Folder[]>(mockFolders);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof File; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const handleFolderClick = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedFile(null);
    setSelectedFiles(new Set());
  }, []);

  const filteredAndSortedFiles = useMemo(() => {
    const folderFiles = files.filter(file => file.folderId === currentFolderId);
    const searchedFiles = folderFiles.filter(file =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return [...searchedFiles].sort((a, b) => {
      if (a[sortConfig.key as keyof typeof a]! < b[sortConfig.key as keyof typeof b]!) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key as keyof typeof a]! > b[sortConfig.key as keyof typeof b]!) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [files, currentFolderId, searchTerm, sortConfig]);

  const handleSort = useCallback((key: keyof File) => {
    setSortConfig(prev => {
      const isAsc = prev.key === key && prev.direction === 'asc';
      return { key, direction: isAsc ? 'desc' : 'asc' };
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedFiles(checked ? new Set(filteredAndSortedFiles.map(f => f.id)) : new Set());
  }, [filteredAndSortedFiles]);

  const handleSelectOne = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) newSet.delete(fileId); else newSet.add(fileId);
      return newSet;
    });
  }, []);

  const breadcrumbPath = useMemo(() => {
    const path: Folder[] = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) { path.unshift(folder); currentId = folder.parentId; } else { currentId = null; }
    }
    return path;
  }, [currentFolderId, folders]);

  const totalStorage = 5 * 1024 * 1024 * 1024; // 5 GB
  const usedStorage = useMemo(() => files.reduce((acc, file) => acc + file.size, 0), [files]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-oklch(98.5% 0.005 250) text-oklch(20% 0.005 250)">
      <TooltipProvider>
        <div className="flex w-full">
          <aside className="w-64 flex-shrink-0 border-r border-oklch(90% 0.005 250) bg-white p-4 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center"><GripVertical className="h-5 w-5 mr-2"/> Knowledge Base</h2>
            <div className="mb-4"><Button className="w-full bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4 mr-2"/> Add Content</Button></div>
            <ScrollArea className="flex-grow">
                <nav className="space-y-1">
                    <button onClick={() => handleFolderClick(null)} className={cn('w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center', !currentFolderId ? 'bg-gray-100' : 'hover:bg-gray-50')}> <FolderIcon className="h-5 w-5 mr-3"/> All Files </button>
                    {renderFolders(folders, null, 0, currentFolderId, handleFolderClick)}
                </nav>
            </ScrollArea>
            <div className="mt-auto">
                <Separator className="my-4"/>
                <p className="text-sm font-medium mb-2">Storage</p>
                <Progress value={(usedStorage / totalStorage) * 100} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{formatFileSize(usedStorage)} of {formatFileSize(totalStorage)} used</p>
            </div>
          </aside>

          <main className="flex-1 flex flex-col p-6">
            <header className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-500">
                    <button onClick={() => handleFolderClick(null)} className="hover:underline">Knowledge Base</button>
                    {breadcrumbPath.map(folder => (
                        <React.Fragment key={folder.id}>
                            <ChevronRight className="h-4 w-4 mx-1" />
                            <button onClick={() => handleFolderClick(folder.id)} className="hover:underline">{folder.name}</button>
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <Input placeholder="Search files..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </header>

            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400"/>
                <p className="mt-4 text-sm text-gray-600">Drag & drop files here, or click to select files</p>
                <p className="text-xs text-gray-500">Maximum file size: 100MB</p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple />
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="font-semibold">{currentFolderId ? folders.find(f=>f.id === currentFolderId)?.name : 'All Files'}</h3>
                        {selectedFiles.size > 0 && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4 mr-2"/> Delete ({selectedFiles.size})</Button>
                                <Button variant="outline" size="sm"><TagIcon className="h-4 w-4 mr-2"/> Tag</Button>
                            </div>
                        )}
                    </div>
                    <ScrollArea className="flex-1">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50 z-10">
                                <tr>
                                    <th className="p-3 w-10 text-left"><Checkbox checked={selectedFiles.size > 0 && selectedFiles.size === filteredAndSortedFiles.length} onCheckedChange={handleSelectAll} /></th>
                                    {['name', 'type', 'size', 'createdAt'].map(key => (
                                        <th key={key} className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort(key as keyof File)}>
                                            <div className="flex items-center">
                                                {key.charAt(0).toUpperCase() + key.slice(1).replace('At', ' Added')}
                                                {sortConfig.key === key && <ArrowUpDown className="h-3 w-3 ml-2" />}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-3 text-left font-medium text-gray-600">Tags</th>
                                    <th className="p-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedFiles.map(file => (
                                    <tr key={file.id} onClick={() => setSelectedFile(file)} className={cn('border-b border-gray-100 hover:bg-gray-50 cursor-pointer', { 'bg-blue-50': selectedFile?.id === file.id })}>
                                        <td className="p-3"><Checkbox checked={selectedFiles.has(file.id)} onCheckedChange={() => handleSelectOne(file.id)} onClick={(e) => e.stopPropagation()} /></td>
                                        <td className="p-3 font-medium text-gray-800">
                                            <div className="flex items-center">
                                                <FileTypeIcon type={file.type} className="mr-3 flex-shrink-0"/>
                                                <span className="truncate max-w-xs">{file.name}</span>
                                                {file.versions.length > 1 && (
                                                    <Tooltip><TooltipTrigger asChild><Badge variant="outline" className="ml-2 font-mono text-xs">v{file.versions[0].version}</Badge></TooltipTrigger><TooltipContent><p>{file.versions.length} versions</p></TooltipContent></Tooltip>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-600">{file.type}</td>
                                        <td className="p-3 text-gray-600">{formatFileSize(file.size)}</td>
                                        <td className="p-3 text-gray-600">{formatDate(file.createdAt)}</td>
                                        <td className="p-3"><div className="flex flex-wrap gap-1">{file.tags.slice(0, 2).map(tag => <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>)}{file.tags.length > 2 && <Tooltip><TooltipTrigger asChild><Badge variant="secondary" className="font-normal">+{file.tags.length - 2}</Badge></TooltipTrigger><TooltipContent><p>{file.tags.slice(2).join(', ')}</p></TooltipContent></Tooltip>}</div></td>
                                        <td className="p-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>Download</DropdownMenuItem><DropdownMenuItem>Rename</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>
                </div>

                <AnimatePresence>
                    {selectedFile && (
                        <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-96 flex-shrink-0 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-2"><FileTypeIcon type={selectedFile.type} className="h-6 w-6"/><h4 className="font-semibold truncate">{selectedFile.name}</h4></div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedFile(null)}><X className="h-4 w-4"/></Button>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 text-sm space-y-4">
                                    <div><h5 className="font-semibold mb-1">Content Preview</h5><p className="text-gray-600 bg-gray-50 p-3 rounded-md text-xs">{selectedFile.content.substring(0, 200)}{selectedFile.content.length > 200 && '...'}</p></div>
                                    <div><h5 className="font-semibold mb-2">Details</h5><div className="grid grid-cols-2 gap-2 text-xs"><div className="text-gray-500">Size</div><div className="text-gray-800 font-medium">{formatFileSize(selectedFile.size)}</div><div className="text-gray-500">Created</div><div className="text-gray-800 font-medium">{formatDate(selectedFile.createdAt)}</div></div></div>
                                    <div><h5 className="font-semibold mb-2">Tags</h5><div className="flex flex-wrap gap-2">{selectedFile.tags.map(tag => <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>)}<Button variant="outline" size="sm" className="text-gray-500"><Plus className="h-3 w-3 mr-1"/> Add Tag</Button></div></div>
                                    <div><h5 className="font-semibold mb-2 flex items-center"><History className="h-4 w-4 mr-2"/> Version History</h5><ul className="space-y-2">{selectedFile.versions.map((v, index) => <li key={v.version} className="flex items-center justify-between text-xs"><p><strong>Version {v.version}</strong>{index === 0 && <Badge variant="outline" className="ml-2 text-green-600 border-green-200">Latest</Badge>}</p><p className="text-gray-500">{formatDate(v.date)} - {formatFileSize(v.size)}</p></li>)}</ul></div>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </div>
  );
}
