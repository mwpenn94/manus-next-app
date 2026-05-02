import DOMPurify from "dompurify";
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileCode, Link as LinkIcon, File as FileIcon, UploadCloud, Trash2, Search, CheckCircle, Loader, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type Document = {
  id: string;
  title: string;
  type: 'pdf' | 'text' | 'url' | 'markdown';
  size: number;
  addedAt: number;
  chunks: number;
  status: 'indexed' | 'processing' | 'failed';
};

type SearchResult = {
  documentId: string;
  chunk: string;
  relevance: number;
};

interface AgentKnowledgeBaseProps {
  documents: Document[];
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
  onSearch: (query: string) => void;
  searchResults?: SearchResult[];
  isSearching: boolean;
}

const typeIcons: Record<Document['type'], React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  text: <FileIcon className="h-5 w-5 text-blue-500" />,
  url: <LinkIcon className="h-5 w-5 text-green-500" />,
  markdown: <FileCode className="h-5 w-5 text-purple-500" />,
};

const statusInfo: Record<Document['status'], { icon: React.ReactNode; color: string; text: string }> = {
  indexed: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-500', text: 'Indexed' },
  processing: { icon: <Loader className="h-4 w-4 animate-spin" />, color: 'bg-yellow-500', text: 'Processing' },
  failed: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-500', text: 'Failed' },
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const AgentKnowledgeBase: React.FC<AgentKnowledgeBaseProps> = ({ documents, onUpload, onDelete, onSearch, searchResults, isSearching }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const totalStorage = useMemo(() => documents.reduce((acc, doc) => acc + doc.size, 0), [documents]);
  const totalChunks = useMemo(() => documents.reduce((acc, doc) => acc + doc.chunks, 0), [documents]);

  const filteredDocuments = useMemo(() => {
    if (activeTab === 'all') return documents;
    return documents.filter(doc => doc.type === activeTab);
  }, [documents, activeTab]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleDelete = () => {
    if (docToDelete) {
      onDelete(docToDelete);
      setDocToDelete(null);
    }
  };

  const documentTypes = useMemo(() => Array.from(new Set(documents.map(d => d.type))), [documents]);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Agent Knowledge Base</CardTitle>
        <div className="text-sm text-muted-foreground flex items-center space-x-4 mt-2">
          <span>{documents.length} Documents</span>
          <span>{totalChunks} Chunks</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSearch} className="relative">
              <Input
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            {searchResults && searchResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Search Results</h3>
                <motion.div layout className="space-y-2">
                  {searchResults.map((result, index) => {
                    const doc = documents.find(d => d.id === result.documentId);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 border rounded-lg bg-accent"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">{doc?.title}</span>
                          <Badge variant="secondary">Relevance: {result.relevance.toFixed(2)}</Badge>
                        </div>
                        <p className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.chunk) }} />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab as (value: string) => void}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {documentTypes.map(type => (
                  <TabsTrigger key={type} value={type} className="capitalize">{type}s</TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeTab} className="mt-4">
                <AnimatePresence>
                  <motion.div layout className="space-y-3">
                    {filteredDocuments.map(doc => (
                      <motion.div
                        key={doc.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' as const }}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {typeIcons[doc.type]}
                          <div>
                            <p className="font-semibold">{doc.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatBytes(doc.size)} &middot; {new Date(doc.addedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="flex items-center gap-1.5">
                            <span className={cn('h-2 w-2 rounded-full', statusInfo[doc.status].color)}></span>
                            {statusInfo[doc.status].text}
                          </Badge>
                          <DialogTrigger asChild onClick={() => setDocToDelete(doc.id)}>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
              )}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Drag & drop files here, or click to select files
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Storage Usage</h4>
              <Progress value={(totalStorage / (5 * 1024 * 1024 * 1024)) * 100} />
              <p className="text-sm text-muted-foreground">
                {formatBytes(totalStorage)} of 5 GB used
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the document and its associated data from the knowledge base.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
