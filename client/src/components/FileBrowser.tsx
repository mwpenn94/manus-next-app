import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, Folder, FolderOpen, Search, Plus, Download, Trash2, Edit, FileText, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  modifiedAt: number;
  children?: FileItem[];
}

interface FileBrowserProps {
  files: FileItem[];
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onDownload: (path: string) => void;
  selectedPath?: string;
}

interface FileTreeNodeProps {
  node: FileItem;
  level: number;
  selectedPath?: string;
  expandedFolders: Set<string>;
  onToggleExpand: (path: string) => void;
  onNodeSelect: (path: string, isDoubleClick: boolean) => void;
  handleContextMenu: (action: 'rename' | 'delete' | 'download', path: string) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ 
    node, level, selectedPath, expandedFolders, onToggleExpand, onNodeSelect, handleContextMenu 
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;

  const Icon = node.type === 'folder' ? (isExpanded ? FolderOpen : Folder) : FileText;

  return (
    <>
      <ContextMenuTrigger>
        <div
          className={cn(
            'flex items-center py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent',
            isSelected && 'bg-primary/20 hover:bg-primary/30'
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          onClick={() => onNodeSelect(node.path, false)}
          onDoubleClick={() => onNodeSelect(node.path, true)}
        >
          <Icon
            className="h-4 w-4 mr-2 flex-shrink-0"
            onClick={(e) => {
              if (node.type === 'folder') {
                e.stopPropagation();
                onToggleExpand(node.path);
              }
            }}
          />
          <span className="flex-grow truncate text-sm">{node.name}</span>
          <span className="text-xs text-muted-foreground w-24 text-right mr-4">{node.size ? formatBytes(node.size) : ''}</span>
          <span className="text-xs text-muted-foreground w-32 text-right">{new Date(node.modifiedAt).toLocaleDateString()}</span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleContextMenu('rename', node.path)}><Edit className="h-4 w-4 mr-2"/>Rename</ContextMenuItem>
        {node.type === 'file' && <ContextMenuItem onClick={() => handleContextMenu('download', node.path)}><Download className="h-4 w-4 mr-2"/>Download</ContextMenuItem>}
        <ContextMenuItem className="text-destructive" onClick={() => handleContextMenu('delete', node.path)}><Trash2 className="h-4 w-4 mr-2"/>Delete</ContextMenuItem>
      </ContextMenuContent>
      <AnimatePresence initial={false}>
        {isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2, ease: 'easeInOut' as const } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeInOut' as const } }}
            style={{ overflow: 'hidden' }}
          >
            {node.children.map(child => (
              <FileTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                expandedFolders={expandedFolders}
                onToggleExpand={onToggleExpand}
                onNodeSelect={onNodeSelect}
                handleContextMenu={handleContextMenu}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  onSelect,
  onDelete,
  onRename,
  onCreateFolder,
  onDownload,
  selectedPath,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set<string>());
  const [actionState, setActionState] = useState<{ type: 'delete' | 'rename'; path: string; } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (selectedPath) {
        const pathParts = selectedPath.split('/').filter(p => p);
        const pathsToExpand = pathParts.reduce((acc, part, i) => {
            const currentPath = '/' + pathParts.slice(0, i + 1).join('/');
            if(i < pathParts.length -1) acc.push(currentPath);
            return acc;
        }, [] as string[]);
        setExpandedFolders(prev => new Set([...Array.from(prev), ...pathsToExpand]));
    }
  }, [selectedPath]);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const handleNodeSelect = (path: string, isDoubleClick: boolean) => {
    onSelect(path);
    const node = findNodeByPath(files, path);
    if (isDoubleClick && node && node.type === 'folder') {
        handleToggleExpand(path);
    }
  };

  const findNodeByPath = (nodes: FileItem[], path: string): FileItem | null => {
      for (const node of nodes) {
          if (node.path === path) return node;
          if (node.children) {
              const found = findNodeByPath(node.children, path);
              if (found) return found;
          }
      }
      return null;
  }

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const lowerCaseQuery = searchQuery.toLowerCase();
    const results: FileItem[] = [];
    const search = (nodes: FileItem[]) => {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(lowerCaseQuery)) {
          results.push(node);
        }
        if (node.children) {
          search(node.children);
        }
      }
    };
    search(files);
    return results;
  }, [searchQuery, files]);

  const handleContextMenu = (action: 'rename' | 'delete' | 'download', path: string) => {
    if (action === 'download') {
        onDownload(path);
    } else {
        setActionState({ type: action, path });
        if (action === 'rename') {
            const node = findNodeByPath(files, path);
            setRenameValue(node?.name || '');
        }
    }
  };

  const handleRename = () => {
    if (actionState?.type === 'rename' && renameValue) {
      onRename(actionState.path, renameValue);
    }
    setActionState(null);
    setRenameValue('');
  };

  const handleDelete = () => {
    if (actionState?.type === 'delete') {
      onDelete(actionState.path);
    }
    setActionState(null);
  };

  const handleCreateFolder = () => {
      const parentPath = selectedPath && findNodeByPath(files, selectedPath)?.type === 'folder' ? selectedPath : (selectedPath?.substring(0, selectedPath.lastIndexOf('/')) || '/');
      onCreateFolder(parentPath === '' ? '/' : parentPath, newFolderName);
      setIsCreatingFolder(false);
      setNewFolderName('');
  }

  const breadcrumbs = useMemo(() => {
    if (!selectedPath) return [];
    const parts = selectedPath.split('/').filter(p => p);
    return parts.map((part, i) => {
        const path = '/' + parts.slice(0, i + 1).join('/');
        return { name: part, path };
    });
  }, [selectedPath]);

  return (
    <Card className="w-full h-[70vh] flex flex-col">
      <CardHeader>
        <CardTitle>File Browser</CardTitle>
        <div className="flex items-center space-x-2 pt-2">
            <div className="relative flex-grow">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search files..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsCreatingFolder(true)}><Plus className="h-4 w-4 mr-2"/>New Folder</Button>
        </div>
        <div className="flex items-center text-sm text-muted-foreground pt-2">
            <span className="cursor-pointer hover:text-foreground" onClick={() => onSelect('/')}>Root</span>
            {breadcrumbs.map(crumb => (
                <React.Fragment key={crumb.path}>
                    <ChevronRight className="h-4 w-4 mx-1" />
                    <span className="cursor-pointer hover:text-foreground" onClick={() => onSelect(crumb.path)}>{crumb.name}</span>
                </React.Fragment>
            ))}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-full">
            <div className="p-2">
                {searchQuery ? (
                    filteredFiles.map(file => (
                        <div key={file.id} className={cn('flex items-center py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent', selectedPath === file.path && 'bg-primary/20')} onClick={() => onSelect(file.path)}>
                            {file.type === 'folder' ? <Folder className="h-4 w-4 mr-2"/> : <FileText className="h-4 w-4 mr-2"/>}
                            <span className="flex-grow truncate text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{file.path}</span>
                        </div>
                    ))
                ) : (
                    files.map(node => (
                        <FileTreeNode
                            key={node.id}
                            node={node}
                            level={0}
                            selectedPath={selectedPath}
                            expandedFolders={expandedFolders}
                            onToggleExpand={handleToggleExpand}
                            onNodeSelect={handleNodeSelect}
                            handleContextMenu={handleContextMenu}
                        />
                    ))
                )}
            </div>
        </ScrollArea>
      </CardContent>

      <AlertDialog open={!!actionState} onOpenChange={() => setActionState(null)}>
        <AlertDialogContent>
            {actionState?.type === 'delete' && (
                <>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the file or folder.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </>
            )}
            {actionState?.type === 'rename' && (
                <>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rename Item</AlertDialogTitle>
                        <AlertDialogDescription>Enter a new name for the item.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus/>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRename}>Rename</AlertDialogAction>
                    </AlertDialogFooter>
                </>
            )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Create New Folder</AlertDialogTitle>
                <AlertDialogDescription>Enter a name for the new folder.</AlertDialogDescription>
            </AlertDialogHeader>
            <Input placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} autoFocus/>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateFolder}>Create</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
